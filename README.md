
# redux-scuttlebutt

Self-replicating, self-ordering log of actions shared between peers.
Using the power of time travel enabled by redux, your application
dispatches and receives actions between its connected peers, creating an
eventually consistent shared state.

## scuttlebutt

> This seems like a silly name, but I assure you, this is real science.
> — [dominictarr/scuttlebutt](https://github.com/dominictarr/scuttlebutt)

Efficient peer to peer reconciliation. We use it as the underlying
protocol to share actions among peers, and to eventually agree on
their logical order. When we encounter actions with a  (one or more
actions ago), we rewind and replay history in the correct order.

For more about the protocol, read the 
[Scuttlebutt paper](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf).

## use

Add the store enhancer to your existing redux application and connect to a 
scuttlebutt peer. Peers will gossip and reconciliate any actions (received 
or dispatched) with all their connected peers.
A sample "server" peer is included which could be extended to sync state changes 
with a database, write a persistent log, or manage system/world/bot actors.

While it works great in a traditional client-server set up, you could flexibly
upgrade/downgrade to peer-to-peer connections. The protocol supports going offline 
for any amount of time, and any changes will sync when you next connect to another 
scuttlebutt instance.

Note, by default, scuttlebutt itself does not make any guarantees of security or
identity: peer `Bob` is able to lie to `Jane` about `Amy`'s actions. Security
guarantees can added using the [`signAsync` and `verifyAsync`](#signasync--verifyasync)
dispatcher options.

## dispatcher

`Dispatcher` is our Scuttlebutt model. It handles remote syncing of local
actions, local dispatching of remote actions, and altering action history
(rolling back to past checkpoints and replaying actions) as required.

## Redux store enhancer

Our default export is the store enhancer. You use it like this:

```js
// configureStore.js

import { createStore, applyMiddleware } from 'redux'

import rootReducer from '../reducers'
import scuttlebutt from 'redux-scuttlebutt'

export default (initialState) => {
  return createStore(rootReducer, initialState, scuttlebutt({
    uri: 'http://localhost:3000',
  }))
}
```

It wraps your store's root reducer (to allow us to store history states),
`getState` (to return the latest history state) and `dispatch` (to dispatch
locally and to connected peers).

Actions which flow through redux-scuttlebutt will have their timestamp and
source added (as non-enumerable properties) to the action's meta object. These
keys are available as the exported constants `META_TIMESTAMP` and
`META_SOURCE`.

Timestamps are logical (not wall-clock based) and are in the format
`<logical timestamp>-<source>`.

### redux-devtools

If you're using the
[redux dev-tools enhancer](https://github.com/gaearon/redux-devtools), it must
come *after* the redux-scuttlebutt enhancer, otherwise connected scuttlebutt
stores will emit devtools actions instead of your application's. For ease of
development, we also export `devToolsStateSanitizer` which allows devtools to
expose your application's internal state (instead of scuttlebutt's):

```js
import scuttlebutt, { devToolsStateSanitizer } from 'redux-scuttlebutt'

const enhancer = compose(
  scuttlebutt(),
  window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__({ stateSanitizer: devToolsStateSanitizer })
    : f => f
)

createStore(counter, undefined, enhancer)
```

## options

The store enhancer takes an options object, including the key
`dispatcherOptions` which is passed directly through to the internal dispatcher:

```js
scuttlebutt({
  // uri of a scuttlebutt peer or server
  uri: `${window.location.protocol}//${window.location.host}`,

  // options for primus.io <https://github.com/primus/primus#getting-started>
  primusOptions: {},

  // the Primus object, can be switched out with any compatible transport.
  primus: (typeof window === 'object' && window.Primus),

  // options passed through to the dispatcher (and their defaults)
  dispatcherOptions: {
    customDispatch: function getDelayedDispatch(dispatcher) {
      return function (action) {
        // the default will batch-reduce actions by the hundred, firing redux's
        // subscribe method on the last one, triggering the actual rendering on
        // the next animationFrame.
        // see: https://github.com/grrowl/redux-scuttlebutt/blob/master/src/dispatcher.js#L22
      }
    },

    isGossipType: function(actionType) {
      // returns a boolean representing whether an action's type should be
      // broadcast to the network.
      // (by default, returns false for actions prefixed with @@, such as @@INIT
      // and internal @@scuttlebutt-prefixed action types)
    },

    verifyAsync: function(callback, action, getStateHistory) {
      // if specified, the verifyAsync function must call callback(false) if the
      // action is invalid, or callback(true) if the action is valid.
      // getStateHistory() will return an array of ordered updates
    },

    signAsync: function(callback, action, getStateHistory) {
      // if specified, the signAsync will be called for every locally dispatched
      // action. must call callback(action) and can mutate the action if
      // desired.
      // getStateHistory() will return an array of ordered updates
    },
  }
})
```

### signAsync & verifyAsync

The dispatcher options `signAsync` and `verifyAsync` allows you to add arbitrary
metadata to actions as they are dispatched, and filter remote actions which are
received from peers. This means you can validate any action against itself or
the redux state, other actions in history, a cryptographic signature, rate
limit, or any arbitrary rule.

For security, you can use
[redux-signatures](https://github.com/grrowl/redux-signatures) to add Ed25519
signatures to your actions. This could be used to
verify authors in a peering or mesh structure.

```js
import { Ed25519, verifyAction, signAction } from 'redux-signatures'

const identity = new Ed25519()

scuttlebutt({
  uri: 'http://localhost:3000',
  signAsync: signAction.bind(this, identity),
  verifyAsync: verifyAction.bind(this, identity),
}))
```

The `getStateHistory` third parameter returns an array of the form
`[UPDATE_ACTION, UPDATE_TIMESTAMP, UPDATE_SOURCE, UPDATE_SNAPSHOT]`. These
`UPDATE_` constants are exported from scuttlebutt.

Note, if your verification is computationally expensive, you are responsible for
throttling/delay (like you might for
[getDelayedDispatch](https://github.com/grrowl/redux-scuttlebutt/blob/4eb737a65e442f388cc1c69c917c8f7b1ee11271/src/dispatcher.js#L23)).

## conflict-free reducers

While `redux-scuttlebutt` facilitates action sharing and enhancing the store,
it's the responsiblity of the app's reducers to apply actions. Overall your app
must be strictly pure, without side effects or non-deterministic mutations.

In a complex real-time multi-user app, this is easier said than done. Some
strategies may be,

* Avoid preconditions. The Game Of Life example only dispatches TOGGLE and STEP.
  Neither have preconditions, there's no "illegal" way to dispatch them, and
  they'll always successfully mutate state.
* Only allow peers (action sources) control over their own domain (entity). An
  entity might request something of another entity, which that entity would then
  dispatch its own action to mutate its own domain.
* Implement a Conflict-free data type, which only allows certain operations in
  exchange for never conflicting.
  See: https://github.com/pfrazee/crdt_notes#portfolio-of-basic-crdts
  * We'd love to expose the most useful and common ones from this library to
    assist with development.

## example

Examples are found under `examples/`.

* `counter`:
  [redux counter example](https://github.com/reactjs/redux/tree/master/examples/counter)
  with the addition of redux-scuttlebutt.
* `chat`: A very basic chat application.
* `grrowl/redux-game-of-life-scuttlebutt`:
  [Conway's Game Of Life](https://github.com/grrowl/redux-game-of-life-scuttlebutt)
  multiplayer edition.

## roadmap and thoughts

* message validation on top of our existing scuttlebutt library
  * robust crypto in the browser comes with a number of performance and security
    tradeoffs, which we don't want to bake into the library itself.
  * our recommendation is to implement what's right for your implementation in
    userland.
  * have released an example of message signing with ed25519 signatures and
    asyncronous message validation
    [in this gist](https://gist.github.com/grrowl/ca94e47a6da2062e9bd6dad211588597).
  * released [redux-signatures](https://github.com/grrowl/redux-signatures)
    which plugs directly into the dispatcher.
    * Allows flexible implementation, e.g. in a client-server topology you may
      only want to use `sign` on the client and `verify` on the server only.
      This avoids running the most processor intensive part on the clients with
      no loss of security.
* underlying `scuttlebutt` implementation
  * currently depends on our
    [own scuttlebutt fork](https://github.com/grrowl/scuttlebutt#logical-timestamps),
    not yet published to npm, I'm not sure if dominictarr wants to accept these
    changes upstream.
  * should probably republish as `scuttlebutt-logical`
* add a `@@scuttlebutt/COMPACTION` action
  * reducers would receive the whole history array as `state`
  * enables removing multiple actions from history which are inconsequential —
    such as multiple "SET_VALUE" actions, when only the last one applies.
  * also enables forgetting, and therefore not replaying to other clients,
    actions after a certain threshold.
* implement CRDT helpers for reducers to easily implement complex shared data
  types.
* tests
  * simulate a multi-hop distributed network with delay, ensure consistency
  * ensure rewind/reordering works
  * ensure API
* allow pluggable socket library/transport
* more example applications! something real-time, event driven.
* WebRTC support
  * Genericize server into websockets and webrtc versions
  * Write client modules to support either

## contributions

Contributions very welcomed. **This project is still in its very early,
experimental stages.**

A major aim of this project is to be able to drop this middleware into an
existing, compatible project and have it "just work". Additional features should
be configurable in redux-scuttlebutt itself or at the highest level of the
application without heavy modification with the redux application's
structure/actions/reducers

## licence

MIT. Without open source projects like React, Redux, Scuttlebutt, and all the
amazing technology which has been the bedrock and inspiration for this project,
many wonderful things in this world wouldn't exist.
