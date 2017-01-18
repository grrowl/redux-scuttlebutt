// queue a _reduxDispatch call, debounced by animation frame.
// configurable, but requires use of private methods at the moment
// keep a reference to dispatcher because methods will change over time
export default function getDelayedDispatch(dispatcher) {
  if (typeof window === 'undefined'
    || typeof window.requestAnimationFrame !== 'function') {
    return false
  }

  const queue = []

  function drainQueue() {
    let state = dispatcher._reduxGetState(),
      i

    for (i = 0; i < 100 && (i <= queue.length - 1); i++) {
      // for-real dispatch the last action, triggering redux's subscribe
      // (and thus UI re-renders). This prioritises crunching data over
      // feedback, but potentially we should dispatch perodically, even
      // with items in the queue
      if (i < queue.length - 1) {
        state = dispatcher._historyReducer(state, queue[i])
      } else {
        dispatcher._reduxDispatch(queue[i])
      }
    }

    // reset the queue
    queue.splice(0, i + 1)

    if (queue.length)
      window.requestAnimationFrame(drainQueue)
  }

  return function delayedDispatch(action) {
    queue.push(action)

    // on first action, queue dispatching the action queue
    if (queue.length === 1) {
      window.requestAnimationFrame(drainQueue)
    }
  }
}
