
import Scuttlebutt, { filter } from 'scuttlebutt-vector'
import * as orderedHistory from './orderedHistory'
import getDelayedDispatch from './getDelayedDispatch'

import {
  // action constants
  UPDATE_ACTION,

  META_TIMESTAMP,
  META_SOURCE
} from './constants'

// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

const defaultOptions = {
  customDispatch: getDelayedDispatch,
  isGossipType: isGossipType,
  verifyAsync: undefined,
  signAsync: undefined,
}

export default class Dispatcher extends Scuttlebutt {
  constructor(options) {
    super()

    this.options = { ...defaultOptions, ...options }

    this._customDispatch =
      this.options.customDispatch && this.options.customDispatch(this)

    this._isGossipType = this.options.isGossipType

    this._verifyAsync = this.options.verifyAsync
    this._signAsync = this.options.signAsync

    // redux methods to wrap
    this._reduxDispatch = () => {
      throw new Error('Are you sure you called wrapDispatch?')
    }
    this._reduxGetState = () => {
      // throw new Error('Are you sure you called wrapGetState?')
      // this must return a default state for the very first history call,
      // before .wrapGetState has been applied in the store enhancer.
      return []
    }
  }

  // wraps the redux dispatch
  wrapDispatch(dispatch) {
    this._reduxDispatch = dispatch

    return (action) => {
      // apply this action to our scuttlebutt model (and send to peers). It
      // will dispatch, taking care of the the appropriate time ordering
      if (this._isGossipType(action.type)) {
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
    return orderedHistory.getInitialState(initialState)
  }

  // rewinds history when it changes
  wrapReducer(reducer) {
    this._historyReducer = orderedHistory.reducer(reducer)

    // wrap the root reducer to track history and rewind occasionally
    return (currentState, action) => {
      return this._historyReducer(currentState, action)
    }
  }

  // Apply update (action) to our store
  // implemented for scuttlebutt class
  applyUpdate(update) {
    const [action, timestamp, source] = update,
      // copy the object so we can modify its properties later
      localAction = { meta: {}, ...action },
      dispatch = (shouldApply) => {
        if (!shouldApply) {
          return
        } else if (this._customDispatch) {
          this._customDispatch(localAction)
        } else {
          this._reduxDispatch(localAction)
        }
      }

    // add our metadata to the action as non-enumerable properties. This is so
    // they won't be serialised into JSON when sent over the network to peers in
    // this.history(), and can be added back by other peers as they receive
    // them
    Object.defineProperty(localAction.meta, META_TIMESTAMP, {
      enumerable: false,
      value: timestamp
    })

    Object.defineProperty(localAction.meta, META_SOURCE, {
      enumerable: false,
      value: source
    })

    if (this._verifyAsync) {
      this._verifyAsync(dispatch, localAction, this._reduxGetState)
    } else {
      dispatch(true)
    }

    // recieved message succesfully. if false, peers may retry the message.
    return true
  }

  // reply to gossip with the latest timestamps for the sources we've seen
  // implemented for scuttlebutt class
  history(sources) {
    // our state (updates[]) has a similar shape to scuttlebutt's own updates.
    return this._reduxGetState().reduce((arr, update) => {
      if (
        update[UPDATE_ACTION]
        && this._isGossipType(update[UPDATE_ACTION].type)
        && filter(update, sources)
      ) {
        // scuttlebutt only wants ACTION, TIMESTAMP, SOURCE, and not: SNAPSHOT
        arr.push(update.slice(0, 3))
      }

      return arr
    }, [])
  }

  // apply an update locally
  // we should ensure we don't send objects which will explode JSON.parse here
  // implemented over scuttlebutt class
  localUpdate(action) {
    if (this._signAsync) {
      this._signAsync(super.localUpdate.bind(this), action, this._reduxGetState)
    } else {
      super.localUpdate(action)
    }
  }
}
