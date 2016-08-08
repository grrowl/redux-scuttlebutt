import { combineReducers } from 'redux'

export default combineReducers({
  counter,
  log
})

/*
  You could also represent the counter's state as a PN-Counter
  as implemented by Meangirls: <https://github.com/aphyr/meangirls#pn-counter>
  and described <https://github.com/pfrazee/crdt_notes#state-based-pn-counter>
*/

export function counter(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    case 'DECREMENT':
      return state - 1
    case 'INCREMENT_ODD':
      return state + (state % 2 ? 1 : 0)
    default:
      return state
  }
}

export function log(state = [], action) {
  return state.concat(action)
}
