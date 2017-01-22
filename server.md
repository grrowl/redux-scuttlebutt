
```js
var scuttlebutt = require('redux-scuttlebutt/lib/server').default
var serverOptions = {}

scuttlebutt(server, serverOptions)
```

# server options

### `dispatcherOptions` and `primusOptions`

## `connectRedux(gossip)`

gossip is a store enhancer, connect it to redux

## `getStatistics()`

return value will be called with (source, event), so you can render statistics

## env vars

### `INFILE`, `OUTFILE`

### `SB_REMOTE`
