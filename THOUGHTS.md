
timestamp idea: lastActionId+timedelta, can we sort reliably on this?

also this was fascinating:
[fault-tolerant broadcast and eventual consistency](http://courses.cs.washington.edu/courses/cse552/97wi/Papers/Isis/html/sld032.htm)

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
