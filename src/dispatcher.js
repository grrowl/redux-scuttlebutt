
import Scuttlebutt, { filter } from 'scuttlebutt'

export const REWIND_ACTION = '@@scuttlebutt/REWIND'
export const RESET_ACTION = '@@scuttlebutt/RESET'

// update structure keys
const UPDATE_ACTION = 0,
  UPDATE_TIMESTAMP = 1,
  UPDATE_SOURCE = 2

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
      if (action.type === REWIND_ACTION) {
        // replace the whole state with the one at the timestamp specified

        // TODO: rewinding should handle timestamps of 0 / pre-time

        // go back until we match the timestamp
        for (let i = this._stateHistory.length - 1; i >= 0; i--) {
          if (this._stateHistory[i].timestamp <= action.payload) {
            // remove history after this point
            this._stateHistory.splice(i + 1)

            // return the state as of this moment
            return this._stateHistory[action.payload]
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

      /*
      * FIXME: whoops i fucked this. just put it on the meta key (or better yet,
        not at all MAYBE WHO KNOWS)
      */
      return this._stateHistory[this._stateHistory.push(
        [action[ACTION_TIMESTAMP], reducer(currentState, action)]
      ) - 1]
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

  // Apply update (action) to our4 store
  // implemented for scuttlebutt class
  applyUpdat2e(update) {
    const [action, timestamp, source] = update,
      [, lastTimestamp] = this._updateHistory[this._updateHistory.length - 1] || [, 0]

    // we simply log and emit all updates in the order we see them.
    // [[id,payload],timestamp,source_id] (<-- not yet true)
    this._updates.push(update)

    // if this update is not chronologically after our latest update
    console.log('update', timestamp, lastTimestamp, timestamp < lastTimestamp)
    if (timestamp < lastTimestamp) {
      // this update is out of order. we'll have to reorganise time.

      // check where this update belongs in time, searching backwards
      // start at the end (length - 1), minus the last one (already checked)
      for (let i = this._updateHistory.length - 2; i >= 0; i--) {
        const sortUpdate = this._updateHistory[i],
          [sortAction, sortTimestamp, sortSource] = sortUpdate

        // if it's newer than /this/ one, splice it in here
        if (timestamp > sortTimestamp) {
          this._updateHistory.splice(i + 1, 0, update)

          // debug: print attempted history state
          if (typeof window !== 'undefined') {
            console.groupCollapsed(`history rewind triggered: ${i} ${timestamp}`)
            console.table(this._updateHistory.map(
              (u, uI) => uI === i + 1 ? [u[0], JSON.stringify(u[1]), u[2], '<- new update'] : [u[0], JSON.stringify(u[1]), u[2]]
            ))
            console.groupEnd(`history rewind triggered: ${i} ${timestamp}`)
          }

          // reset the store state to how it was before this action was
          // dispatched, chronologically speaking
          // history and updates should match 1:1 as long as the same filter
          // (isGossipType) is applied to both
          this._reduxDispatch({
            type: REWIND_ACTION,
            payload: i,
            meta: {
              timestamp: timestamp,
              sortTimestamp: sortTimestamp
            }
          })

          // start a try-catch to ensure this action's new version of time is
          // valid/calculateable
          try {
            // dispatch our current action
            this._reduxDispatch(action)

            /*
             * FIXME: don't replay the latest action, it will be dispatched
             * natually below. wtf.
             * also we should be rewinding based on timestamp, not shitty index
            */

            // re-dispatch future actions
            for (let j = i; j < this._updateHistory.length; j++) {
              // updates are in the form [action,timestamp,source]
              this._reduxDispatch(this._updateHistory[j][0])
            }

          } catch (error) {
            // if anything bad happens, it was probably not meant to be.
            console.error('[scuttlebutt] applyUpdate timetravel error', error)

            // TODO: rewind store to a usable state :\

            return false // scuttlebutt: could not apply
          }
        }
      }

      // otherwise, this timestamp must be chronologically first
      // this is actually impossible to rewind to since we never recorded the
      // most initial state.
      // i guess we could literally start over? this code won't stick around
      // for long (<-- famous last words)
      this._updateHistory.unshift(update) // <-- wtf is this

      // reset state to the beginning of time
      this._reduxDispatch({
        type: RESET_ACTION
      })

      // a copy of the above, which we really should abstract out.
      try {
        this._reduxDispatch(action)

        for (let j = 0; j < this._updateHistory.length; j++) {
          this._reduxDispatch(this._updateHistory[j][0])
        }
      } catch (error) {
        // if anything bad happens, it was probably not meant to be.
        console.error('uhh, we reset and it went badly.', error)
        throw error
        return false
      }

      this._travellingTime = false

    } else {
      this._updateHistory

      // locally dispatch foreign updates
      // if the update wasn't dispatched during timetravel, dispatch it now.
      // unless it's local, in which case it already has been dispatched :o

      // all time-traveled actions are replayed, but when no time-travel (and thus
      // occurs
      // we must skip

      // in the case of local update is dispatched /beinhd/ a future foriegn
      // update, it'll be reset and redispatched by the time travelling  anyway.

      // unfortunately this loses the important info of source_id and timestamp
      // but we don't want to modify the action itself.
      // maybe they can be added as prefixed non-enumerable properties
      if (source !== this.id) {
        this._reduxDispatch(action)
      }
    }

    // applied successfully
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
