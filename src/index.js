const Primus = window.Primus
import Dispatcher from './dispatcher'

export default (options = {}) => (store) => {
  // initialise network io
  console.log('[io] connecting...')

  const ioOptions = {},
    io = Primus.connect('http://localhost:3000', ioOptions),
    gossip = new Dispatcher(),
    gossipStream = gossip.createStream(),
    history = { actions: [], state: [] }

  // the internet is a series of tubes

  // spark.pipe(docStream).pipe(spark)

  io.on('data', function message(data) {
    // console.log('[io] <-', data)
    gossipStream.write(data)
  })

  gossipStream.on('data', (data) => {
    // console.log('[io] ->', data)
    io.write(data)
  })

  // network events

  io.on('open', () => {
    console.log('[io] connection open')
  })

  io.on('error', (error) => {
    console.log('[io] error', error)
  })

  // store stream events

  gossipStream.on('error', (error) => {
    console.warn('[gossip] error', error)
  })

  // handshake header recieved from a new peer. includes their id and clock info
  gossipStream.on('header', (header) => {
    const { id, clock } = header
    console.log('[gossip] header', id)
  })

  // store events

  gossip.on('replay', (actions) => {
    console.log('[gossip] list was reordered', row)
  })

  gossip.on('action', (action, timestamp, source_id) => {
    console.info('[gossip] recieved', action, timestamp, source_id)

    if (source_id !== gossip.id) {
      // this action was emitted elsewhere, so dispatch locally

      // try-catch to ensure update is applied correctly.
      // TODO: we might consider calling next() directly? is that idiomatic?
      try {
        store.dispatch({
          ...action,
          __remote: true
        })
      } catch(error) {
        console.error('ERROR DISPATCHING ACTION', error)
      }
    }
  })

  return (next) => (action) => {
    const nextState = next(action)

    history.actions.push(action)
    history.state.push(nextState)

    if (!action.__remote) {
      const result = gossip.localUpdate(action)

      // console.log('[gossip] action status', result)
      // console.log('[gossip] state', actions.asArray())
    }

    // return next(action)
    return nextState
  }
}
