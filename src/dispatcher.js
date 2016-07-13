import Scuttlebutt, { filter } from 'scuttlebutt'

export const REWIND_ACTION = '@@scuttlebutt/REWIND'

// ignore actiontypes beginning with @
// by default just pass through missing types (redux will blow up later)
export function isGossipType(type = '') {
  return type.substr(0, 1) !== '@'
}

const _formatSource = (source = '????') => `${source.substr(0,2)}…${source.substr(-4,4)}`,
  _formatTime = (time) => (new Date(time)).toJSON().substr(-10,9),
  _formatUpdate = (action, full) => `${_formatSource(action[2])} ${_formatTime(action[1])}${full ? action[0] : '~'}`

export default class Dispatcher extends Scuttlebutt {
  constructor() {
    super()

    // history of all current updates
    // in-recieved-order is for scuttlebutt, sorted for time travel
    this._updates = []
    this._sortedUpdates = []

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
        // return reducer(currentState, action, console.log('shouldacouldawoulda', currentState, action))
        console.log('rewinding to state', action.payload, states[action.payload])
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
    const [, lastTimestamp] = this._sortedUpdates[this._sortedUpdates.length - 1] || [, 0]

    // we simply log and emit all actions, and ensure their order as we see them.
    // [[id,payload],timestamp,source_id]
    this._updates.push([action, timestamp, source])


    // if newer than the newest action
    // theoretically, timestamps should never match
    // our local updates will always be the newest. MAYBE (clocks!)
    console.info('applyUpdate', _formatTime(timestamp), '>', _formatTime(lastTimestamp))
    if (timestamp > lastTimestamp || !lastTimestamp) {
      this._sortedUpdates.push([action, timestamp, source])
    } else {
      // check where this update belongs in time, searching backwards
      for (let i = this._sortedUpdates.length - 1; i >= 0; i--) {
        const sortUpdate = this._sortedUpdates[i],
          [sortAction, sortTimestamp, sortSource] = sortUpdate

        // if it's newer than this one, this is where it belongs
        if (timestamp > sortTimestamp) {
          // older timestamp greater than recent max
          console.warn(`found proper location, ${
            this._sortedUpdates.length - 1 - i
          } away`, _formatUpdate(sortUpdate), 'then', _formatUpdate([action, timestamp, source]))

          // supply the point to rewind to (history index of newerTimestamp)
          this._sortedUpdates.splice(i + 1, 0, [action, timestamp, source])

          this._reduxDispatch({
            type: REWIND_ACTION,
            // go back to this index in the store
            // our _actions should match _states 1:1, for now
            // and we'll reset to the state /before/ i-action was dispatched
            payload: i
          })

          // now our new action
          this._reduxDispatch(action)

          try {
            // dispatch all the actions since this point, again
            for (let j = i + 1; j < this._updates.length; j++) {
              // dispatch each following action
              console.warn('replaying', j, _formatUpdate(this._updates[j]))
              this._reduxDispatch(this._updates[j][0])
            }
          } catch (error) {
            // if anything bad happens, it was probably not meant to be.
            console.warn('uhh, we messed with time and it went badly.', error)
            throw error
            return false
          }

          // otherwise, it all went smoothly
          break
        }
      }
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
