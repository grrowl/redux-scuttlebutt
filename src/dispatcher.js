
import Scuttlebutt, { filter } from 'scuttlebutt'

export const REWIND_ACTION = '@@scuttlebutt/REWIND'
export const RESET_ACTION = '@@scuttlebutt/RESET'

export const META_TIMESTAMP = '@@scuttlebutt/TIMESTAMP'
export const META_SOURCE = '@@scuttlebutt/SOURCE'

// update and state history structure keys
const UPDATE_ACTION = 0,
  UPDATE_TIMESTAMP = 1,
  UPDATE_SOURCE = 2,
  // state snapshot is post-action
  STATE_ACTION = 0,
  STATE_TIMESTAMP = 1,
  STATE_SNAPSHOT = 2


// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

// not used any more?
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

  // wraps the initial state, if any, into the first snapshot
  wrapInitialState(initialState) {
    return initialState && [,,initialState]
  }

  // rewinds history when it changes
  wrapReducer(reducer) {
    // wrap the root reducer to track history and rewind occasionally
    // currentState is our higher-order form, an array of [snapshot, timestamp]
    return (currentState = [], action) => {
      const timestamp = action && action.meta && action.meta[META_TIMESTAMP]
      let stateIndex

      // this will dispatch an action after the snapshot preceding it, then will
      // replay actions which occurred after it (if any)
      // rewind to -1 for "before the start of time"
      for (stateIndex = currentState.length - 1; stateIndex >= -1; stateIndex--) {
        const thisTimestamp = currentState[stateIndex] && currentState[stateIndex][STATE_TIMESTAMP],
          thisSnapshot = stateIndex === -1 ? undefined : currentState[stateIndex][STATE_SNAPSHOT]

        // thisTimestamp will be undefined until the first timestamped action.
        // if this action has no timestamp, we're before the start of time, or,
        // crucially, if this action is newer than the this snapshot
        if (!timestamp || !thisTimestamp || stateIndex === -1 || timestamp > thisTimestamp) {
          // add to history in the shape [ACTION, TIMESTAMP, SNAPSHOT]
          // splice doesn't perform well, btw.
          currentState.splice(stateIndex + 1, 0, [
            action,
            timestamp || thisTimestamp, // in case on missing timestamp
            reducer(thisSnapshot, action)
          ])

          // -1 for length to index, -1 for the additional element we just added to the array
          /*
          if (stateIndex !== currentState.length - 2 && typeof window !== 'undefined') {
            console.log(`time travelled ${timestamp} after ${thisTimestamp} (𝛥${timestamp - thisTimestamp}ms)`)
          }
          */

          break
        }
      }

      // replay any actions after the one just dispatched. skip the last item
      // of the array, so it won't run for regular, in-order actions
      // skip the inserted action (index + 1)
      for (stateIndex = stateIndex + 2; stateIndex < currentState.length; stateIndex++) {
        const thisState = currentState[stateIndex],
          thisAction = thisState[STATE_ACTION],
          lastState = currentState[stateIndex - 1],
          lastSnapshot = lastState ? lastState[STATE_SNAPSHOT] : undefined

        /*
        * FIXME: very destructive action. if the update fails, we'll have fucked
        * all the past histories... but surely they can be replayed.
        * applyUpdate() should dispatch a special "FORGET_ACTION" which removes
        * our timestamped new action and replays the previously-good state.
        * this realistically means we're **quietly catching all errors in the
        * reducer chain**.
        */

        // update each state snapshot, secretly hoping each action passes
        // console.log(`-> replaying action ${stateIndex}`,
        //   thisAction, thisState[STATE_TIMESTAMP], thisAction === action)

        thisState[STATE_SNAPSHOT] = reducer(lastSnapshot, thisAction)

        // deubg: add a checksum of the ordered timestamps to the store
        if (typeof window !== 'undefined') {
          function checksum(arr) {
            var chk = 0x12345678;

            for (let i = 0; i < arr.length && !isNaN(arr[i]); i++) {
              chk += (arr[i] * (i + 1));
            }

            return chk;
          }
          window.__checksum = checksum(currentState.map(state => state[STATE_TIMESTAMP]))
        }
      }

      // if we're here, the currentState history has been updated
      return currentState
    }

  }

  // wraps getState to return the latest state snapshot
  // will always be called after @@redux/INIT
  wrapGetState(getState) {
    return () => {
      const state = getState(),
        lastState = state[state.length - 1]

      return lastState && lastState[STATE_SNAPSHOT]
    }
  }

  // Apply update (action) to our store
  // implemented for scuttlebutt class
  applyUpdate(update) {
    const [action, timestamp, source] = update,
      // [, lastTimestamp] = this._updateHistory[this._updateHistory.length - 1] || [, 0],
      // add our metadata to the action
      localAction = {
        ...action,
        meta: {
          ...action.meta,
          [META_TIMESTAMP]: timestamp,
          [META_SOURCE]: source
        }
      }

    // we log all updates to emit in the order we saw them.
    // not sure if it's better than replaying in order of timestamp (which might
    // cut down on the amount of time travelling done by all peers), but seems
    // like the de facto for scuttlebutt models
    this._updates.push(update)

    try {
      this._reduxDispatch(localAction)
    } catch (error) {
      // an update failed, so we'll consider this update invalid
      console.error('error applying update', localAction)
      console.error(error.stack)

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

    return true

    console.info('applyUpdate success', update)
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
