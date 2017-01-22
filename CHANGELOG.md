# 0.3.4-0.3.5

* Adds `server` options `connectRedux`, `getStatistics`, `primusOptions` and
  `dispatcherOptions`

# 0.3.3

* Fixes initialState always being undefined, now uses
  `orderedHistory.getInitialState`
* Default `getDelayedDispatch` moved to its own file.
* Now depends on [`scuttlebutt-vector`](https://github.com/grrowl/scuttlebutt),
  instead pointing to a github branch.

# 0.3.2

* Exports `devToolsStateSanitizer`to better display state in redux dev-tools.
  Thanks @sanfilippopablo
* Use new, non-depreciated devtools extension hook. Thanks @zalmoxisus

# 0.3.1

* Adds dispatcher option `signAsync`. This allows flexible signing or other
  mutation of locally dispatched actions.

# 0.3.0

* Internally, we now use the redux history for gossiping with other
  scuttlebutts, instead of maintaining a separate history.
* Adds dispatcher option `verifyAsync`. This allows flexible validation of
  actions.
* Adds Dispatcher unit tests

# 0.2.1

* Adds `SECURE_SB` env variable support to the server, so you can connect and
  replicate with a remote redux-scuttlebutt

# 0.2.0

* **Breaking change** `timestamp` is now *logical*. This means it has no
  relationship with wall-clock time.
  * Updates are now strictly sorted by [timestamp, source].
* Tests for orderedHistory
* Stores and replays scuttlebutt updates in timestamp-source order, not recieved order
  * True to the original paper, better in high-latency situations
* Create new scuttlebutt streams for re-connections
  * Increases reconnection reliability
* Adds option function `isGossipType`
* Don't explode on actions without a `meta` property. This fixes the chat example.

# <0.1

Inital releases.
