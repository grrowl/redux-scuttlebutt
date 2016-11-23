require('babel-register')

var dispatcher = require('redux-scuttlebutt/lib/server').default

var webpack = require('webpack')
var webpackDevMiddleware = require('webpack-dev-middleware')
var webpackHotMiddleware = require('webpack-hot-middleware')
var config = require('./webpack.config')

var port = process.env['PORT'] || 3000

var app = new (require('express'))()
var server = require('http').Server(app)

var compiler = webpack(config)
app.use(webpackDevMiddleware(compiler, { noInfo: true, publicPath: config.output.publicPath }))
app.use(webpackHotMiddleware(compiler))

app.get("/", function(req, res) {
  res.sendFile(__dirname + '/index.html')
})
app.get("/multiple", function(req, res) {
  res.sendFile(__dirname + '/multiple.html')
})

dispatcher(server)

server.listen(port, function(error) {
  if (error) {
    console.error(error)
  } else {
    console.info("==> 🌎  Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
  }
})
