import { combineReducers } from 'redux'

export default combineReducers({
  counter,
  log
})

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
