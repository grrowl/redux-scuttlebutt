import Dispatcher from './dispatcher'
import { REWIND_ACTION } from './constants'

export { isGossipType } from './dispatcher'
export { META_SOURCE, META_TIMESTAMP, REWIND_ACTION } from './constants'


// Applies default options.
const defaultOptions = {
  uri: 'http://localhost:3000',
  primusOptions: {},
  primus: (typeof window === 'object' && window.Primus),
  dispatcherOptions: {},
}

// Store enhancer
// Wraps createStore to inject our history reducer, wraps dispatch to send and
// receive actions from peers, and FIXME: getState to apparently break everything
//
export default function scuttlebutt(options) {
  options = { ...defaultOptions, ...options }

  return (createStore) => {
    // is it more efficient to store previous states, or replay a bunch of
    // previous actions? (until we have COMMIT checkpointing, the former)
    const scuttlebutt = connectGossip(
        new Dispatcher(options.dispatcherOptions),
        options.uri,
        options.primusOptions,
        options.primus
      )

    return (reducer, preloadedState, enhancer) => {
      const store = createStore(
        scuttlebutt.wrapReducer(reducer),
        [[,,preloadedState]], // preloaded state is the earliest snapshot
        enhancer)

      return {
        ...store,
        scuttlebutt,
        dispatch: scuttlebutt.wrapDispatch(store.dispatch),
        getState: scuttlebutt.wrapGetState(store.getState),
      }
    }
  }
}

// initialise network io
function connectGossip(scuttlebutt, uri, primusOptions, Primus) {
  scuttlebutt.io = Primus.connect(uri, primusOptions)

  console.log('[io] connecting...')

  connectStreams(scuttlebutt.io, () => scuttlebutt.createStream())

  return scuttlebutt
}

// the internet is a series of tubes
function connectStreams(io, createStream) {
  // would love to do this. it doesn't work:
  // spark.pipe(docStream).pipe(spark)

  let DEBUG_DELAY
  if (/^#\d+/.test(window.location.hash)) {
    DEBUG_DELAY = parseInt(window.location.hash.substr(1))
    console.debug('delayed connection active', DEBUG_DELAY)
  }

  let gossip

  // scuttlebutt uses 'stream', but primus does not, hence the lopsided pipe

  // io.on('data', function message(data) {
  //   // console.log('[io] <-', data)
  //   if (DEBUG_DELAY) {
  //     return setTimeout(() => gossip.write(data), DEBUG_DELAY)
  //   }
  //   gossip.write(data)
  // })

  // gossip.pipe(io)
  // gossip.on('data', (data) => {
  //   // console.log('[io] ->', data)
  //   if (DEBUG_DELAY) {
  //     return setTimeout(() => io.write(data), DEBUG_DELAY)
  //   }
  //   io.write(data)
  // })

  // network events

  io.on('open', () => {
    console.log('[io] connection open')

    // create fresh stream,
    // discard the old one (hopefullly .destroy()d on 'end')
    gossip = createStream()
    gossip.pipe(io)

    io.on('data', function message(data) {
      // console.log('[io] <-', data)
      if (DEBUG_DELAY) {
        return setTimeout(() => gossip.write(data), DEBUG_DELAY)
      }
      gossip.write(data)
    })

    io.on('end', () => {
      console.log('[io] ended')
      gossip.end()
      gossip.destroy()
    })

    // store stream events

    gossip.on('error', (error) => {
      console.warn('[gossip] error', error)
      io.end(undefined, { reconnect: true })
    })

    // handshake header recieved from a new peer. includes their id and clock info
    gossip.on('header', (header) => {
      const { id, clock } = header
      console.log('[gossip] header', id)
    })

  })

  io.on('error', (error) => {
    console.log('[io] error', error)
  })

}
