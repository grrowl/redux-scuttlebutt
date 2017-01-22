import fs from 'fs'

const INFILE = process.env['INFILE'],
  OUTFILE = process.env['OUTFILE'],
  REMOTE_SB = process.env['REMOTE_SB']

const defaultOptions = {
  connectRedux,
  getStatistics,
  primusOptions: {},
  dispatcherOptions: {},
}

export default function scuttlebuttServer(server, options) {
  options = { ...defaultOptions, ...options }

  const primusServer = new (require('primus'))(server, options.primusOptions),
      Dispatcher = require('./dispatcher').default,
      gossip = new Dispatcher(options.dispatcherOptions),
      onStatistic = options.getStatistics()

  // connect dispatcher to redux
  options.connectRedux(gossip)

  // read actions from file
  if (INFILE) {
    const gossipWriteSteam = gossip.createWriteStream()
    fs.createReadStream(INFILE).pipe(gossipWriteSteam)

    console.log('📼  Reading from ' + INFILE)
  }

  // stream actions to file -- this will include all actions in INFILE
  if (OUTFILE) {
    const gossipReadSteam = gossip.createReadStream()

    // For some reason, we're not getting any 'sync' events from Dispatcher,
    // so we'll listen for it in the datastream and write to disk after it
    // <https://github.com/dominictarr/scuttlebutt#persistence>

    gossipReadSteam.on('data', (data) => {
      if (data === '"SYNC"\n') {
        console.log('📼  Writing to ' + OUTFILE)
        gossipReadSteam.pipe(fs.createWriteStream(OUTFILE))
      }
    })

    // this doesn't fire.
    gossip.on('sync', function () {
      console.log('📼  [NATURAL SYNC] Writing to ' + OUTFILE)
      gossipReadSteam.pipe(fs.createWriteStream(OUTFILE))
    })

    console.log('📼  Ready to write to ' + OUTFILE)
  }

  // connect to remote redux-scuttlebutt instance
  if (REMOTE_SB) {
    var remoteStream = gossip.createStream(),
      remoteClient = new primusServer.Socket(REMOTE_SB)

    console.log('💡  connecting to remote '+ REMOTE_SB)

    remoteClient.pipe(remoteStream).pipe(remoteClient)

    onStatistic('REMOTE_SB', 'connect')

    remoteClient.on('data', function recv(data) {
      // console.log('[io]', 'REMOTE_SB', '<-', data);
      onStatistic('REMOTE_SB', 'recv')
    });

    remoteStream.on('data', (data) => {
      // console.log('[io]', 'REMOTE_SB' || 'origin', '->', data);
      onStatistic('REMOTE_SB', 'sent')
    })

    remoteStream.on('error', (error) => {
      onStatistic('REMOTE_SB', 'error', error)
      console.log('[io]', 'REMOTE_SB', 'ERROR:', error);
      remoteClient.end('Disconnecting due to error', { reconnect: true })
    })
  }

  primusServer.on('connection', (spark) => {
    var stream = gossip.createStream()

    // console.log('[io] connection', spark.address, spark.id)

    onStatistic(spark.id, 'connect')

    spark.on('data', function recv(data) {
      // console.log('[io]', spark.id, '<-', data);
      onStatistic(spark.id, 'recv')
      stream.write(data)
    });

    stream.on('data', (data) => {
      // console.log('[io]', spark.id || 'origin', '->', data);
      onStatistic(spark.id, 'sent')
      spark.write(data)
    })

    stream.on('error', (error) => {
      onStatistic(spark.id, 'error', error)
      console.log('[io]', spark.id, 'ERROR:', error);
      spark.end('Disconnecting due to error', { reconnect: true })
    })
  })

  primusServer.on('disconnection', (spark) => {
    onStatistic(spark.id, 'disconnect')
    // in case you don't want to track zombie connections
    // delete statistics[spark.id]
  })

}

function connectRedux(gossip) {
  const Redux = require('redux'),
    reducer = (state = [], action) => state.concat(action),
    store = Redux.createStore(gossip.wrapReducer(reducer), undefined),
    dispatch = gossip.wrapDispatch(store.dispatch),
    getState = gossip.wrapGetState(store.getState)

  // other things we might want to do ->
  // store.subscribe(render)
  // setInterval(function () { dispatch({ type: 'TICK' }) }, 1000)
}

function getStatistics() {
  const statistics = {}

  var statisticsDirty = true

  // prime statistics for when spark.id is undefined, presumably server messages
  statistics[undefined] = {
    recv: 0, sent: 0, s: 'other'
  }

  setInterval(() => {
    if (!statisticsDirty)
      return

    statisticsDirty = false

    /*
    // full client statistics
    console.log('# ' + (new Date()) + '')
    for (let spark in statistics) {
      console.log(`${spark}: ${statistics[spark].recv} recv ${statistics[spark].sent} sent (${statistics[spark].s})`)
    }
    */

    // basic statistics
    console.log([
      (new Date()).toLocaleString('en-AU'),
      ': ',
      (() => {
        let recv = 0, sent = 0, connected = 0, disconnected = 0, other = 0
        for (let spark in statistics) {
          recv += statistics[spark].recv
          sent += statistics[spark].sent

          if (statistics[spark].s === 'connected')
            connected++
          else if (statistics[spark].s === 'disconnected')
            disconnected++
          else
            other++
        }

        return `recv ${recv}, sent ${sent}, (${connected} 🌏, ${disconnected} 🔕, ${other} 👥)`
      })()
    ].join(''))

  }, 10000) // max 6/minute

  return (source, event, extra) => {
    statisticsDirty = true
    if (event === 'connect') {
      statistics[source] = {
        recv: 0, sent: 0, s: 'connected'
      }
    } else if (event === 'disconnect') {
      statistics[source] = {
        recv: 0, sent: 0, s: 'disconnected'
      }
    } else if (event === 'error') {
      statistics[source] = {
        recv: 0, sent: 0, s: 'error', err: extra,
      }
    } else if (event === 'recv' || event === 'sent') {
      statistics[source][event]++
    }
  }
}
