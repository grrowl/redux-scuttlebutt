
import Scuttlebutt, { filter } from 'scuttlebutt'

export const REWIND_ACTION = '@@scuttlebutt/REWIND'
export const RESET_ACTION = '@@scuttlebutt/RESET'

export const META_TIMESTAMP = '@@scuttlebutt/TIMESTAMP'

// update and state history structure keys
const UPDATE_ACTION = 0,
  UPDATE_TIMESTAMP = 1,
  UPDATE_SOURCE = 2,
  // state snapshot is post-action
  STATE_SNAPSHOT = 0,
  STATE_ACTION = 1


// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

function createRewindAction(timestamp) {
  return {
    type: REWIND_ACTION,
    payload: timestamp
  }
}

const formatSource = (source = '????') => `${source.substr(0,2)}…${source.substr(-4,4)}`,
  formatTime = (time) => (new Date(time)).toJSON().substr(-10,9),
  formatUpdate = (action, full) => `${formatSource(action[2])} ${formatTime(action[1])} ${full ? JSON.stringify(action[0]) : '~'}`

export default class Dispatcher extends Scuttlebutt {
  constructor() {
    super()

    // history of all current updates
    // in-recieved-order is for scuttlebutt, sorted for time travel
    this._updates = []
    this._updateHistory = []

    // history of store states after each action was applied
    this._stateHistory = []

    // dispatch to redux
    this._reduxDispatch = () => {
      throw new Error('Are you sure you called wrapDispatch?')
    }
  }

  // wraps the redux dispatch
  wrapDispatch(dispatch) {
    this._reduxDispatch = dispatch

    return (action) => {
      // apply this action to our scuttlebutt model (and send to peers). It
      // will dispatch, taking care of the the appropriate time ordering
      if (isGossipType(action.type)) {
        this.localUpdate(action)
      } else {
        return dispatch(action)
      }
    }
  }

  // rewinds history when it changes
  wrapReducer(reducer) {
    // wrap the root reducer to track history and rewind occasionally
    return (currentState, action) => {
      if (typeof window !== 'undefined') {
        console.groupCollapsed(`about to do ${action}`)
        console.table(this._stateHistory)
        console.groupEnd('about to do', action)
      }

      if (action.type === REWIND_ACTION) {
        // replace the whole state with the one at the timestamp specified

        /*
        * TODO: rewinding should be able to accept timestamps of 0 / pre-time
        */

        // go back until we match the timestamp
        // rewind to -1 to "before the start of time"
        for (let i = this._stateHistory.length - 1; i >= 0; i--) {
          const action = this._stateHistory[i][STATE_ACTION],
            timestamp = action && action.meta && action.meta[META_TIMESTAMP]

          if (typeof window !== 'undefined')
            console.debug(`ts ${timestamp} <= ${action.payload}? ${timestamp <= action.payload && '✅'}`)
          else {
            console.log(`ts ${timestamp} <= ${action.payload}? ${timestamp <= action.payload && '✅'}`)
            console.log(`ts ${timestamp} <= ${action.payload}? ${timestamp <= action.payload && '✅'}`)
          }

          // if this state had an action
          if (timestamp <= action.payload) {
            // remove history after this point. ahahah how dangerous
            this._stateHistory.splice(i + 1)

            // return the state as of this moment
            return this._stateHistory[i][STATE_SNAPSHOT]
          }
        }

        throw new Error(`Could not rewind to ${action.payload}`)

      } else if (action.type === RESET_ACTION) {
        // reset the whole store back to its initial state
        this._stateHistory = []
        console.log('reset state')
        return reducer(undefined, action)
      }

      // ignore private action types. they'll still affect history, but it's
      // not important to us that it happened
      if (!isGossipType(action.type)) {
        return reducer(currentState, action)
      }

      // add to state history in form [STATE_SNAPSHOT, STATE_ACTION]
      return this._stateHistory[this._stateHistory.push(
        [reducer(currentState, action), action]
      ) - 1][STATE_SNAPSHOT]
    }

  }

  // Apply update (action) to our store
  // implemented for scuttlebutt class
  applyUpdate(update) {
    const [action, timestamp, source] = update,
      [, lastTimestamp] = this._updateHistory[this._updateHistory.length - 1] || [, 0]

    // we log all updates to emit in the order we saw them.
    // not sure if it's better than replaying in order of timestamp (which might
    // cut down on the amount of time travelling done by all peers), but seems
    // like the de facto for scuttlebutt models
    this._updates.push(update)

    // check if in the past
    if (timestamp < lastTimestamp) {
      // check where this update belongs in time, searching backwards
      // start at the end (length - 1), minus the last one (already checked)

      // search, rewind to -1 for "before the start of time"
      for (let i = this._updateHistory.length - 2; i >= -1; i--) {
        // when -1, it's pre-time, so nothing exists.
        const sortUpdate = (i === -1 ? [, 0] : this._updateHistory[i]),
          [sortAction, sortTimestamp, sortSource] = sortUpdate

        // if it's newer than /this/ one, splice it in here
        if (timestamp > sortTimestamp) {
          // add to update history
          this._updateHistory.splice(i + 1, 0, update)

          // rewind to how things would have been at action time
          // this will be the state AFTER the action of this timestamp was
          // applied. This balances wit hthe splice (above) and replay (below)
          this._reduxDispatch(createRewindAction(timestamp))

          // and replay every action since then (starting with our new one)
          let j;
          try {
            for (let j = i + 1; j < this._updateHistory.length; j++) {
              // updates are in the form [action,timestamp,source]
              this._reduxDispatch(this._updateHistory[j][UPDATE_ACTION])
            }
          } catch (error) {
            // an update failed, so we'll consider this update invalid
            console.error('error applying update', this._updateHistory[j], error)

            /*
            * TODO: recover from erroroneous action:
            *   remove update, replay old history. could do the actual splice
            *   after the update succeeds? better performance under conflict-
            *   prone conditions
            */
            if (typeof window !== 'undefined')
              console.warn('your store is probably in a terrible state rn')

            return false // do not emit to peers
          }

          // job done,
          break

        } else if (i === -1) {
          // if we weren't after the beginning of time, something's wrong
          throw new Error('update occurred before the beginning of time')
        }
      }

      // we'll reach here only after dispatching

    } else {
      // a new latest update, lets just append and dispatch
      this._updateHistory.push(update)
      this._reduxDispatch(action)
    }

    console.info('applyUpdate success', update)
    return true
  }

  // gossip
  // implemented for scuttlebutt class
  history(sources) {
    return this._updates.filter(function(update) {
      return filter(update, sources)
    })
  }

  // apply an update locally
  // we should ensure we don't send objects which will explode JSON.parse here
  // implemented over scuttlebutt class
  localUpdate(action) {
    if (process.env.NODE_ENV === 'development') {
      try {
        super.localUpdate(action)
      } catch (error) {
        throw new Error('Scuttlebutt couldn\'t dispatch', error)
      }
    } else {
      // try our luck
      super.localUpdate(action)
    }
  }

  // super.localUpdate(this._filterUpdate(action))
  // Recurse through the value and attempt to prune unserializable leaf objects.
  // A well-structured app won't be dispatching bad actions like this, so
  // this might become a dev-only check. also, it's far from foolproof.
  _filterUpdate(value) {
    if (typeof value !== 'object')
      return value

    if (value && value.constructor
      && /(^Synthetic|Event$)/.test(value.constructor.name))
      return null

    const result = {}
    for (const prop in value) {
      result[prop] = this._filterUpdate(value[prop]);
    }
    return result
  }
}
