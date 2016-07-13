
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
write a persistent log, or dispatch npc/system actions.

While it works great in a client-server set up, you could upgrade/downgrade to
peer-to-peer connections, or go offline, and changes sync when you next connect.

Note, it does not make any guarantees of security or identity. Peer `Bob` is
free to lie to `Jane` about `Amy`'s actions. A client-server layout
can mitigate this risk, and WebSockets over SSL mitigates MITM replacement, but
as the project matures this will be brought into consideration.

For more, read the
[Scuttlebutt paper](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf).

## dispatcher

`Dispatcher` is our Scuttlebutt model. It crosses the streams of local and remote actions keeps track of alternate h alters time as it sees fit. (and eventually--
shared checkpointing and garbage collection)

## middleware

This is our Redux middleware. It takes note of all dispatched actions, and
dispatches its own actions when the occur elsewhere. (and eventually-- It also deals with setting the record straight when actions are out of order)

## example

Included is the
[redux counter example](https://github.com/reactjs/redux/tree/master/examples/counter)
migrated to redux-scuttlebutt, under `examples/counter/`.

## roadmap

* rewind redux state when actions arrive out of order
  * limit history to max `n` states, max `t` age, or network consensus age
  * recover when invalid actions sequences occur
    * if the root reducer `returns false` that would be great, as long we can reset to last good state and resume quickly
* lock down socket library and allow pluggable option
* tests
  * simulate a multi-hop distributed network with delay, ensure consistency
  * ensure rewind/reordering works
  * ensure API
* example application, something real-time, event driven, social.

## contributions

Contributions very welcomed. **This project is still in its very early,
experimental stages.**

A major aim of this project is to be able to drop this middleware into an
existing, compatible project and have it "just work". Additional features
(timestamp strategy, streams and encryption) should be configurable in
redux-scuttlebutt itself without messing with the redux application's
structure/actions/reducers

## licence

MIT. Without open source projects like React, Redux, Scuttlebutt, and all the
amazing libraries which have been an inspiration for this project, many
wonderful things in this world wouldn't exist.
