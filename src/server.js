
function entries(O) {
  var obj = (O);
  var entrys = [];
  for (var key in obj) {
    // if (has(obj, key) && isEnumerable(obj, key)) {
      entrys.push([key, obj[key]]);
    // }
  }
  return entrys;
};

export default function scuttlebuttServer(server) {
  const primusServer = new (require('primus'))(server, {}),
      Dispatcher = require('./dispatcher').default,
      gossip = new Dispatcher(),
      gossipStream = gossip.createStream()

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

    for (let spark in statistics) {
      console.log(`${spark}: ${statistics[spark].recv} recv ${statistics[spark].sent} sent (${statistics[spark].s})`)
    }
    console.log('^^^ ' + (new Date()) + ' ^^^')
  }, 10000)

  connectRedux(gossip)

  gossipStream.on('data', (data) => {
    console.log('[gossip]', data)
  })

  primusServer.on('connection', (spark) => {
    var stream = gossip.createStream()

    // console.log('[io] connection', spark.address, spark.id)

    statistics[spark.id] = {
      recv: 0, sent: 0, s: 'connected'
    }

    spark.on('data', function recv(data) {
      // console.log('[io]', spark.id, '<-', data);
      statistics[spark.id] ? statistics[spark.id].recv++ : console.log(`${spark.id} didn't have recv stats ready?`)
      statisticsDirty = true
      // statistics[spark.id].recv++
      stream.write(data)
    });

    stream.on('data', (data) => {
      // console.log('[io]', spark.id || 'origin', '->', data);
      statistics[spark.id] ? statistics[spark.id].sent++ : console.log(`${spark.id} didn't have sent stats ready?`)
      statisticsDirty = true
      spark.write(data)
    })

    stream.on('error', (error) => {
      console.log('[io]', spark.id, 'ERROR:', error);
    })
  })

  primusServer.on('disconnection', (spark) => {
    statistics[spark.id].s = 'disconnected'
    // delete statistics[spark.id]
  })

}

function connectRedux(gossip) {
  const Redux = require('redux'),
    reducer = (state = [], action) => state.concat(action),
    store = Redux.createStore(gossip.wrapReducer(reducer), undefined),
    dispatch = gossip.wrapDispatch(store.dispatch)

  // other things we might want to do ->
  // store.subscribe(render)
}
