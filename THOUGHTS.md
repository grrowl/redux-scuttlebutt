in the spirit of open source, here's some related thoughts. (newest first)

----

## verifyAsync against any arbitrary rule

would be cool to have examples like "everyone can only use each letter once",
although it has race conditions involved. maybe thats a good thing for example?
although in real life your stores will diverge :O

```js
import { UPDATE_ACTION } from 'redux-scuttlebutt'

function verifyAsync(callback, action, getStateHistory) {
  const history = getStateHistory(),
    prevUpdate = history[history.length - 1],
    prevAction = prevUpdate && prevUpdate[UPDATE_ACTION]

  if (
    // if this message doesn't include an e
    action && action.payload
      && action.payload.indexOf('e') === -1
    // and the previously message didn't include an e
    && prevAction && prevAction && prevAction.payload
      && prevAction.payload.indexOf('e') === -1
  ) {
    callback(false)
  } else {
    callback(true)
  }
}
```

## prior art

Most of my research has been on the technical side, reading papers and looking
at protocols, lots of theory. Turns out people are working on similar problems
today:

* https://github.com/philholden/redux-swarmlog - similar module, extending
  swarm.js
  * `redux-swarmlog` composes `swarmlog` which composes `hyperlog` which
    is a Merkle DAG which replicates based on scuttlebutt logs.
* https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html
* https://github.com/dominictarr/scuttlebucket - nested scuttlebutts. probably
  not relevant for us yet, as we leave the data modelling up to the reducers.
* https://github.com/Netflix/msl - Netflix's Message Security Layer
* https://www.pubnub.com/docs/web-javascript/pam-security

Data Type implementations

* https://github.com/aphyr/meangirls: CRDTs implemented in Ruby.
* https://github.com/ericmoritz/crdt: CRDTs in Python

### scuttlebutts

* `scuttlebutt` (current) hasn't had many updates in favour of
* `secure-scuttlebutt` which (i think) is way too heavy for our purposes.
    * 'secret-handshake` sets up a excellent encrypted connection
* `simple-scuttlebutt` is great but implements a state-based CRDT. we really just
  want a simple op log
* `swarm-protocol` implements a shared *partially ordered* log between peers
  * great: cypto-strong guarantee layer. Subscriptions (somehow)
  * too much: `Spec` defines "type" and "ID" (for Model id and types),


All scuttlebutts/swarm are designed to be:
* Replication layer (op, replicate, client id, encryption/security)
* -> Model (applies ops, updates outer-facing State)
  * Model handles the "timestamp" but the datatypes *should*
*handle* *concurrent* *updates*
* -> Renderable, whatever that is. Usually React without Redux.
  * What does Redux "give" us?
  * regular Flux already has "actions", via dispatcher, through


We add some layers in order in order to vastly complicate the datatypes you can
represent. (as in, you're not just handling a single, or a handful of objects
with specific CRDT semantics, but a huge number of nested CRDTs scattered across
reducer root keys and depths. Reducers can be combined/nested trivially.)

^^ *that's the ticket* Traditional replicated CRDT libraries expose a single or
a handful of CRDT models. `redux-scuttlebutt` makes it easy to have a multiple
complex CRDTs. It's just redux -- you don't need to use React, your store will
always be the "current state".


Our scuttlebutt/swarm is designed to be:
* Replication layer (op, replicate, client id, encryption/security)
  * Store enhancer, controls the operation of the Redux layer
  * Serializes Actions with (client id + timestamp)
  * Security: this user is unique
* Redux / OpConsumer layer (totally orders and replays actions)
  * Exists
* Reducing later (applies actions which might be Ops)
  * Normal Reducer
* Renderable layer (redux subscribe and render())
  * Could also be non-React

* "Client id"
  * Denoted by "public key" or "hash"
* Security
  *

#### subscribing

Swarm uses `.on` to say "i want to subscribe to this Object with this ID"
We don't have "objects" with "IDs" -- we have a root-level "scope" which all
actions are scoped to. This means we can't use Swarm ops unless we implement
similar semantics.

We'd rather know _everything_ within that scope. Is this compatible with
"snapshots", given that we can't just "getState()" in this method?

```
// store
{
  scopes{}: scopesReducer({
    entities:
  })
}
```

```
// getState()
{
  scopes: {
    index: {
      entities: [],
      players: [],
      worldMutations: [],
    }
  }
}
```

scopedReducer({
  entities,
  players,
  worldMutations,
}) => like combineReducers, but splits actions according to meta.@@scope key.

so, returns
{
  [@@scope]: { entities, players, worldMutations },
  [@@scope]: { ... },
  ~~undefined~~: { ... } // unscoped actions should not take effect within here.
}



## not really scuttlebutt

It occurs to me that many of the original reasons for CRDTs (concurrent actions
coming from everywhere) since we are already re-ordering time before applying
the operations. It's a cool feature of redux but effectively you can only write
"generative" apps.

Entities don't *lose* health, they *gain* damage. // Totally correct. To reduce
your damage, you'd implement `current = taken - healed`. So who's in control of
that `entities.player1.damage[]` variable?

* We give the `player1` domain the player, other Dispatchers say DAMAGE_PLAYER
  and player says UPDATE_ENTITY?
* Anyone dispatches DAMAGE_PLAYER but the player/we somehow validate if it's a
  "valid" one.
  This introduces preconditions / is turning into try-catch again.
* Laissez-faire: everyone can do everything at all times.

Receiving and spending money is hellish, or is it?

* You could have an "item" which can be transferred
  * Block chain-like, a TRANSFER_OWNERSHIP must match `.owner` to the pubkey of
    the action creator, which updates the key. If owner doesn't match, no action
    is performed.
  * No error state -- no match, no update.
  *
  * Function of the timestamp. If someone posts that timestamp before you, you
    lose.
    * Obvious vector for shenanigans, we need something stronger than time-based



## batched updates/subscribe

* `ReactDOM.unstable_batchedUpdates`: Batches the actual updating of the view
  (it queues all DOM updates) but runs all Redux reducing and rendering on time.
* `redux-batched-subscribe`: Batches the actual subscribe calls.

It seems we either

* Wrap subscribe() to prevent notifying listeners while we're calculating stuff.
* Only dispatch a single action with a bunch of actions, which is
  handled/reduced in wrapReducer. ugh. this is better and Dan Abramov approved™
  but requires a more complicated implementation.
  see: <https://twitter.com/dan_abramov/status/656074974533459968>

## gossiping in recieved order (default) vs chronological order

chronological order is theoretically much more efficient as we have to replay
less. since scuttlebutt acknowledges with the message itself, as long as we
communicate from *oldest* to newest, the "last seen timestamp" aspect of the
protocol is preserved.

the underlying implementation is not so large actually -- once features such as
rendering, security/verification, etc. are on top, it'll be worth be looking at
much lower level optimisations/features.

needs more investigation into the dispatch -> localUpdate -> applyUpdate ->
network chain. We ideally want to "batch up" multiple mesasges which come in at
"once", but it seems we're quite rigidly just responding to events. Needs
buffered streams

> RESULT: gossiping in chronological order is better than the current default.

## extremely brief thoughts on animation

Your actions, reducer, and store should only include the most basic information
about your entities. // CREATE_ENTITY at [0,0]. MOVE_BOX_IMPULSE

- describe the impulse of the actions themselves.
  - CREATE_PROJECTILE, origin[], velocity[], *acceleration*
  - how does q3 define *acceleration*? just a formula, right?
  - rocket (accelerates), grenade (initial velcity + gravity), paint air
-

## thoughts on identity action chains

peers subscribe to rooms, and emit chains. scuttlebot, secure-scuttlebutt, etc.
add a lot of stuff about identity and stuuuufff but our goals are ???

create identity action. special store? pub keys and root hashes. prev hash +
priv key -> new hash. all actions are part of a chain linked to identities,
therefore easily attributable.

in a world scenario, everything would be an Actor. to move a box, for example,
you'd ask the box to change states, and it would in turn. actors and messages.
you're in total control of your tiny little domain, and so are they.

reducers know *how* things should act and reject actions which don't make sense,
eg. identity with scope player emitting MOVE_BOX actions (or, WILL_ENTITY_MOVE)
will fail in the reducer. this means we need to error-catch all remote
dispatches to potentially reject them.

root identity store, anyone can create a new one. identity -> actor (creates
actions) -> actioncreator -> disptach -> reducer -> store/reality. each dispatch
must include [thishash, prevhash, pubkey]. thishash = prevhash + privkey.
following hash follows the same rules. (one to one, or many?). scopes can be
added by an identity with the scope to do so.

this will have to exist in the middleware itself, which means mutating actions
which was something to avoid eh. we can wrap the native action in a network
wrapper [0x,0x,0x,action] which validates. but still expose meta.identity, which
mutates action— and we want to expose identities in state too. guh.

-------

on wrap reducer: add time travel reducer, add identity reducer. on applyUpdate:
validate time order, validate identity chain, dispatch identity actions(?),
scope/permission ~~validation~~ can happen in native reducers (maybe all this is
additional plugin middleware) -- validation requires getState().identity.

```
action.@identity.key = pubkey at @identity.key
action.@identity.scope = ['some_shit'] subset of @identity.scope
action.@identity ... etc
```

if these additional checks are satisfied, the updates are commited to store
(WILL_ENTITY_MOVE -> entity.wantVelocity)

so: TimeTravelReducer, IdentityReducer.

i really, really wish there was a way other than `throw Error` to do so but i
guess it might do, other than informing our root reducer how to 'look' for
errors 'thrown' in the reducer, which we could also do having them plug into our
store enhancer itself.

## thoughts on testing dispatcher

ugh. love tests until not love tests.

* out-of-order simulation
  * clientA = dispatch every 500ms
  * clientB = delayed 750ms, dispatch every 1000ms
  * replay: x-0, A-500, A-1000, A-1500, B-750 @ 1750, A-2000
  * client B's message will be inserted between A3 and A4
  * client A will have to rewind to 1000


timestamp idea: lastActionId+timedelta, can we sort reliably on this?

## intermission - related reading

* also this was fascinating:
  [fault-tolerant broadcast and eventual consistency](http://courses.cs.washington.edu/courses/cse552/97wi/Papers/Isis/html/sld032.htm)
* [Doom3 network architecture](http://fabiensanglard.net/doom3_documentation/The-DOOM-III-Network-Architecture.pdf)
* [Efficient Reconciliation and Flow Control for Anti-Entropy Protocols](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf)


## thoughts on redux-scuttlebutt without scuttlebutt

if you'll only ever connect with one peer, you can do away with scuttlebutt and
simply ensure action order by timestamp (or better,
[Lamport Timestamps](https://en.wikipedia.org/wiki/Lamport_timestamps)). Server
has the same job (sans scuttlebutt) of basically reflecting actions as they come
in[1], and the clients themselves ensure order. you would still need clever
reconsiliation aside from FWW, i'd think.

1. and potentially running its own reducer to ensure it doesn't pass on actions
  leading to an invalid state.
  although wouldn't this lead to very racy conditions where the earlier actions
  are strongly favoured? if a action chain is valid, and an old message comes in
  which was perfectly valid at the time would be more likely to be invalid due
  to the actions /afterward/

## thoughts on rewinding redux store

[`redux-devtools-instrument`](https://github.com/zalmoxisus/redux-devtools-instrument/blob/master/src/instrument.js)
does a lot of heavy lifting (fair enough, it's very powerful). We only need a
subset of features: ROLLBACK, PERFORM_ACTION, and COMMIT. So when an
out-of-order action is encountered:

* *rewind* to the action's timestamp (currently a regular unix timestamp,
  eventually a lamport timestamp)
* *dispatch* the new action
  * and all actions which occur later, acoording to the timestamp.
* Eventually *commit* as the application's state has been reliably propogated
  to peer(s)

reducer history: [every,buttly,state]
update history: [[every,0,0],[buttly,0,0],[action,0,0]]

therefore:
  lengths should always match (after dispatch?)

- we save the state /before/ each actionable action
- we reset to that state /before/ the new action^ and the following^ actions

### challenges: rewind and commit

* redux-devtools-instrument stores a log of all computed states.
* `commit` squashes historic commits into a snapshot of the state itself
* `rewind` restores to previous state or point-in-time-of-action
* `replay` dispatches an action again
* (`action` is when a action happens for the first time, but they're almost
  exactly the same)


## thoughts on scuttlebutt implementations

I chose [scuttlebutt](https://github.com/dominictarr/scuttlebutt) because it's
the simplest. Other implementations I found add security, or CRDT features, or
databases, which abstract away the lower-level features we so sorely crave.

We're confident that an existing purely calculated redux setup should be able to
drop in this middleware and "just work". Additional features (timestamp
strategy, streams and encryption) should be configurable in redux-scuttlebutt
and still maintain the core redux structure/architecture

* [secure-scuttlebutt](https://github.com/dominictarr/secure-scuttlebutt) -
  by the creator of scuttlebutt, adds "unforgability" to the protocol, but adds
  significant complexity of identities, feeds, messages; not "plug and
  play"-able
* [simple-scuttle](https://github.com/AWinterman/simple-scuttle) - same
  protocol, but quite tied to CRDT implementations (changes -> history -> state)

## thoughts on crdts

* CRDTs are great for distributedly broadcasting and recieving changes without
  conflict
* scuttlebutt is made for CRDTs (Conflict-free Resolution Data Types)
* _redux is a CRDT_
  * Actions are "ops"
  * Store state is the "model"
  * Ops come in, make change to the state, and if a op can't safely be applied
    to the state (and the resolver throws an error), we communicate this failure
    to the network at large and scuttlebutt "sorts it out".
* We use scuttlebutt

* crdt is good but the underlying data models are made for *changing data over
  time*
  * underlying crdt is *great* and is implemented in many libraries
  * CmRDT is specifically what we want -- actions are the "operations" and
    redux state is the "store"
* scuttlebutt is well suited (in regards to 'consistency' and timestamps) when docs/objects
  are affected by an "owner" -- so cross-owner actions like hitting a crate will cause race
  conditions
  * scuttlebutt is actually great, but insecure -- sally can easily convince us
    that bob said or did something, and we'd believe it.
* swarm looks a bit more proper, but implements a lot of shit.
  * at least it's modular

> Swarm and scuttlebutt's "big features" are CRDT — which is kind of like the "state", wrapped around "ops", which are basically changes to the state. It seems Redux could benefit from exposing these Ops directly (as actions), as long as they can be reliably timestamped. Swarm also has the ability to subscribe BUT SO DOES
SOCKET.IO but only at a socket level so we'd be connecting the same server store
to the client stores multiple times.


## ordering consistency

* scuttlebutt does this by shuffling the data as its coordinating across peers
  * but more importantly, timestamps are peer-supplied and thus can't be used
    as sorting
* scuttlebot does this by electing the master to decide
* or use hyperlog, which replicates a graph chain of leaf nodes with metadata.
  * this solves "chain history" but what about event order?
  * again, are there interaction cases where this is awesome? potentially becuase
    every action /comes/ from somewhere

* hopefully a tree-based log so we'll always sort it into a /consistent/ order, even
  if it has nothing to do with time.
