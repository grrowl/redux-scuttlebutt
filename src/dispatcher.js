import Scuttlebutt, { filter } from 'scuttlebutt'

export default class Dispatcher extends Scuttlebutt {
  constructor() {
    super()
    const store = this._store = []
    this._hash = {}
  }

  // Apply update (action) to our store
  applyUpdate([action, timestamp, source]) {
    // we simply log and emit all actions, and ensure their order as we see them.
    // [[id,payload],timestamp,source_id]
    this._store.push([action, timestamp, source])

    // ensure order
    let newerTimestamp = Infinity
    for (let i = this._store.length - 1; i >= 0; i--) {
      const [thisAction, thisTimestamp, thisSource] = this._store[i]

      if (thisTimestamp > newerTimestamp) {
        // older timestamp greater than recent max
        console.warn('out of order!!!', newerTimestamp, thisAction, thisTimestamp, thisSource)
      }
    }

    this.emit('action', action, timestamp, source)

    // applied successfully
    return true
  }

  history(sources) {
    return this._store.filter(function(update) {
      return filter(update, sources)
    })
  }

  localUpdate(action) {
    // console.log('result', this._filterUpdate(action))
    // super.localUpdate(this._filterUpdate(action))
    super.localUpdate(action)
  }

  // Recurse through the value and attempt to remove unserializable objects.
  // A well-structured app won't be dispatching bad actions like this, so
  // this might become a dev-only check
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

  // Returns the internal store.
  // Note, is in the format [[id,value],ts,source]
  getState() {
    return this._store
  }

  // TODO: emit 'replay'/'rewind' event when old actions come in

  // TODO: garbage collect / compress actions into a single diff
}
