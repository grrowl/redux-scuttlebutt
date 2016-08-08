import {
  META_TIMESTAMP,

  STATE_ACTION,
  STATE_TIMESTAMP,
  STATE_SNAPSHOT
} from './constants'


// Returns the state at this point in time
export const getState = (state) => {
  const lastState = state[state.length - 1]

  return lastState && lastState[STATE_SNAPSHOT]
}

// wrap the root reducer to track history and rewind occasionally
// currentState is our higher-order form, an array of [snapshot, timestamp]
export const reducer = (reducer) => (currentState = [], action) => {
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
        // the action itself
        action,
        // in case of missing timestamp, set it to the most previous action's timestamp
        // it'll still be `undefined` for the very first (non-gossip) action (@redux/INIT)
        timestamp || thisTimestamp,
        // the result of running this action. we'll return it later.
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

    // debug: add a checksum of the ordered timestamps to the store
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
