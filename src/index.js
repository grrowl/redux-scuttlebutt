const Primus = window.Primus
import Dispatcher, { REWIND_ACTION } from './dispatcher'

// Store enhancer
// Wraps createStore to inject our history reducer
export default function scuttlebutt(options = null) {
  return (createStore) => {
    // is it more efficient to store previous states, or replay a bunch of
    // previous actions? (until we have COMMIT checkpointing, the former)
    const history = { state: [] },
      gossip = connectGossip(new Dispatcher())

    return (reducer, preloadedState, enhancer) => {
      const store = createStore(gossip.wrapReducer(reducer), preloadedState, enhancer)

      return {
        ...store,
        dispatch: gossip.dispatch(store.dispatch)
      }
    }
  }
}

// initialise network io
function connectGossip(scuttlebutt) {
  const io = Primus.connect('http://localhost:3000')

  console.log('[io] connecting...')

  connectStreams(io, scuttlebutt.createStream())

  return scuttlebutt
}

// the internet is a series of tubes
function connectStreams(io, gossip) {
  // would love to do this. it doesn't work:
  // spark.pipe(docStream).pipe(spark)

  io.on('connection', (spark) => {
    // spark is the new connection.
    console.log('[io] connected', spark)
  });

  io.on('disconnection', (spark) => {
    // spark is the new disconnection.
    console.log('[io] disconnected', spark)
  });

  io.on('data', function message(data) {
    console.log('[io] <-', data)
    gossip.write(data)
  })

  gossip.on('data', (data) => {
    console.log('[io] ->', data)
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

  gossip.on('error', (error) => {
    console.warn('[gossip] error', error)
  })

  // handshake header recieved from a new peer. includes their id and clock info
  gossip.on('header', (header) => {
    const { id, clock } = header
    console.log('[gossip] header', id)
  })
}


// --------------

export const hey = (options = {}) => (store) => {
  return (next) => {
    // store events


    return (action) => {

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
}

