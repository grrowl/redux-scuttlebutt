export default function scuttlebuttServer(server) {
  const primusServer = new (require('primus'))(server, {}),
      Dispatcher = require('./dispatcher').default,
      gossip = new Dispatcher(),
      gossipStream = gossip.createStream()

  connectRedux(gossip)

  gossipStream.on('data', (data) => {
    console.log('[gossip]', data)
  })

  primusServer.on('connection', (spark) => {
    var stream = gossip.createStream()

    console.log('[io] connection', spark.address, spark.id)

    spark.on('data', function recv(data) {
      console.log('[io]', spark.id, '<-', data);
      stream.write(data)
    });

    stream.on('data', (data) => {
      console.log('[io]', spark.id || 'origin', '->', data);
      spark.write(data)
    })

    stream.on('error', (error) => {
      console.log('[io]', spark.id, 'ERROR:', error);
    })
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
