import { combineReducers } from 'redux'
import { META_TIMESTAMP, META_SOURCE } from 'redux-scuttlebutt/lib/dispatcher'

export default combineReducers({
  messages,
  sources
})

export function messages(state = [], action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return state.concat({
        message: action.payload,
        source: action.meta && action.meta[META_SOURCE],
        timestamp: action.meta && action.meta[META_TIMESTAMP]
      })
    default:
      return state
  }
}

export function sources(state = {}, action) {
  if (action.meta && action.meta[META_SOURCE]) {
    return {
      ...state,
      [action.meta[META_SOURCE]]: action.meta[META_TIMESTAMP]
    }
  }

  return state
}

