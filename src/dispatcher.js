
import Scuttlebutt, { filter } from 'scuttlebutt'
import * as orderedHistory from './orderedHistory'

import {
  // action constants
  REWIND_ACTION,
  RESET_ACTION,
  META_TIMESTAMP,
  META_SOURCE
} from './constants'

// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

export default class Dispatcher extends Scuttlebutt {
  constructor() {
    super()

    // history of all current updates
    // in-recieved-order is for scuttlebutt, sorted for time travel
    this._updates = []
    this._updateHistory = []

    // history of store states after each action was applied
    this._stateHistory = []

    // redux methods to wrap
    this._reduxDispatch = () => {
      throw new Error('Are you sure you called wrapDispatch?')
    }
    this._reduxGetState = () => {
      throw new Error('Are you sure you called wrapGetState?')
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

  // wraps getState to the state within orderedHistory
  wrapGetState(getState) {
    this._reduxGetState = getState

    return () => orderedHistory.getState(getState())
  }

  // wraps the initial state, if any, into the first snapshot
  wrapInitialState(initialState) {
    return initialState && [,,initialState]
  }

  // rewinds history when it changes
  wrapReducer(reducer) {
    const historyReducer = orderedHistory.reducer(reducer)

    // wrap the root reducer to track history and rewind occasionally
    return (currentState, action) => {
      return historyReducer(currentState, action)
    }
  }

  // Apply update (action) to our store
  // implemented for scuttlebutt class
  applyUpdate(update) {
    const [action, timestamp, source] = update,
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

    if (this._delayedDispatch) {
      this._delayedDispatch(localAction)
    } else {
      this._reduxDispatch(localAction)
    }

    // recieved message succesfully. if false, peers may retry the message.
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
