import Scuttlebutt, { filter } from 'scuttlebutt'

export const REWIND_ACTION = '@@scuttlebutt/REWIND'

// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

export default class Dispatcher extends Scuttlebutt {
  constructor() {
    super()

    // history log of actions and points in time
    this._actions = []

    // dispatch to redux
    this._reduxDispatch = a => a
  }

  // wraps the redux dispatch
  wrapDispatch(dispatch) {
    this._reduxDispatch = dispatch

    return (action) => {
      if (isGossipType(action.type)) {
        this.localUpdate(action)
      }
      return dispatch(action)
    }
  }

  // rewinds history when it changes
  wrapReducer(reducer) {
    const states = []

    // wrap the root reducer to track history and rewind occasionally
    return (currentState, action) => {
      if (action.type === REWIND_ACTION) {
        // replace the whole state with the previous index provided
        // the index here naturally matches the index in scuttlebutt._actions
        return states[action.payload]
      }

      // ignore private action types. they'll still affect history, but it's
      // not important to us that it happened
      if (isGossipType(action.type)) {
        return states[states.push(reducer(currentState, action)) - 1]
      }

      return reducer(currentState, action)
    }
  }

  // Apply update (action) to our store
  // implemented for scuttlebutt class
  applyUpdate([action, timestamp, source]) {
    // we simply log and emit all actions, and ensure their order as we see them.
    // [[id,payload],timestamp,source_id]
    this._actions.push([action, timestamp, source])

    // check where this update belongs in time
    for (let i = this._actions.length - 1; i >= 0; i--) {
      const [thisAction, thisTimestamp, thisSource] = this._actions[i]

      // if this timestamp belongs here, and we're not at the end of time
      if (timestamp < thisTimestamp && i !== this._actions.length - 1) {
        // older timestamp greater than recent max
        console.warn('temporal shift detected', source, timestamp, '<', thisTimestamp, thisSource)
        break //

        // supply the point to rewind to (history index of newerTimestamp)
        this._reduxDispatch({
          type: REWIND_ACTION,
          // go back to this index in the store
          // our _actions should match _states 1:1, for now
          // and we'll reset to the state /before/ i-action was dispatched
          payload: i - 1
        })

        try {
          // dispatch all the actions since this point, again
          for (let j = i; j < this._actions.length; j++) {
            // dispatch each following action
            this._reduxDispatch(this._actions[j])
          }
        } catch (error) {
          // if anything bad happens, it was probably not meant to be.
          console.warn('uhh, we messed with time and it went badly. the store is probably fucked. sorry.')
          return false
        }

        // otherwise, it all went smoothly
        break
      }

      // otherwise, we check all the way back to the start of time. just in case
    }

    // locally dispatch foreign updates
    if (source !== this.id) {
      // unfortunately this loses the important info of source_id and timestamp
      // but we don't want to modify the action itself.
      // maybe they can be added as prefixed non-enumerable properties
      this._reduxDispatch(action)
    }

    // applied successfully
    return true
  }

  // gossip
  // implemented for scuttlebutt class
  history(sources) {
    return this._actions.filter(function(update) {
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
  // Recurse through the value and attempt to remove unserializable objects.
  // A well-structured app won't be dispatching bad actions like this, so
  // this might become a dev-only check. also, it's not foolproof.
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
