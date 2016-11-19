
# redux-scuttlebutt

<!--
Self-replicating, self-ordering log of actions shared between all clients.
Using the power behind redux's hot reloading and time travel, your client
dispatches actions itself and so does every other client, they share the state,
and it all just works.
-->

## scuttlebutt

> This seems like a silly name, but I assure you, this is real science.
> — [dominictarr/scuttlebutt](https://github.com/dominictarr/scuttlebutt)

Efficient peer to peer reconciliation. We use it as the underlying
protocol to share dispatched redux actions among peers, and eventually agree on
their order in time. As actions from the past arrive, we replay history as if
they had always existed.

A sample "server" peer is included, which might sync changes to a database,
write a persistent log, or manage system/world/NPC actors.

While it works great in a client-server set up, you could upgrade/downgrade to
peer-to-peer connections, or go offline, and changes sync when you next connect.

Note, scuttlebutt does not make any guarantees of security or identity. Peer
`Bob` is free to lie to `Jane` about `Amy`'s actions. A client-server layout can
mitigate this risk, and WebSockets over SSL mitigates MITM replacement, but as
the project matures this will be brought into consideration.

For more, read the
[Scuttlebutt paper](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf).

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

It wraps your store's root reducer (to store history), `getState` (to return the
current state in history) and `dispatch` (to connect to peers).

## options

The store enhancer takes an options object, including the key
`dispatcherOptions` which is passed directly through to the internal dispatcher:

```js
scuttlebutt({
  // uri of a scuttlebutt peer or server
  uri: 'http://localhost:3000',

  // options for primus.io <https://github.com/primus/primus#getting-started>
  primusOptions: {},

  // the Primus object, can be switched out with any compatible transport.
  primus: (typeof window === 'object' && window.Primus),

  // options passed through to the dispatcher
  dispatcherOptions: {
    // the default will batch-reduce actions by the hundred, firing redux's
    // subscribe method on the last one, triggering the actual rendering on the
    // next animationFrame.
    // see: https://github.com/grrowl/redux-scuttlebutt/blob/master/src/dispatcher.js#L22
    customDispatch: getDelayedDispatch, // (dispatcher) => (action) => {}

    // returns whether an action's type should be broadcast to the network.
    // (returns false for @@INIT and internal @@scuttlebutt-prefixed action
    // types)
    isGossipType: isGossipType(actionType), // (actionType) => bool
  },
})
```

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

<!--
You may have to `npm link` your redux-scuttlebutt directory and `npm link redux-
scuttlebutt` your example project directory during development.
-->

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
  * i've released an example of message signing with ed25519 signatures and
    asyncronous message validation
    [in this gist](https://gist.github.com/grrowl/ca94e47a6da2062e9bd6dad211588597).
* some comments on our underlying `scuttlebutt` implementation
* add a `@@scuttlebutt/COMPACTION` action
  * reducers would recieve the whole history array as `state`
  * enables removing multiple actions from history which are inconsequential —
    such as multiple "SET_VALUE" actions, when only the last one applies.
  * also enables forgetting, and therefore not replaying to other clients,
    actions after a certain threshold
* implement CRDT helpers for reducers to easily implement complex shared data
  types.
* tests
  * simulate a multi-hop distributed network with delay, ensure consistency
  * ensure rewind/reordering works
  * ensure API
* allow pluggable socket library/transport
* more example applications! something real-time, event driven.

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
