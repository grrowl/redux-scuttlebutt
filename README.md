
# redux-scuttlebutt

## goals

enables predictable shared states between redux applications, for real-time
and potentially action-heavy, apps.

currently in the experimental stage, feedback welcome.

## scuttlebutt

> [This seems like a silly name, but I assure you, this is real science.](https://github.com/dominictarr/scuttlebutt)

Self-replicating, self-ordering log of actions shared between all clients.
Using the power behind redux's hot reloading and action rewind/replay, your
client dispatches actions itself and so does every other client, and it all just
works. No API, and no server needed.

## dispatcher

This is our Scuttlebutt model. You `.record(action)`, and listen for
`'message'` events. It deals with action synchronisation (and eventually--
shared checkpointing and garbage collection)

## middleware

This is our Redux middleware. It takes note of all dispatched actions, and
dispatches its own actions when the occur elsewhere. (and eventually-- It also deals with setting the record straight when actions are out of order)

## roadmap

* rewind redux state when actions arrive out of order
  * implement history tracking
  * limit history to max `n` states, max `t` age, or network consensus age
    * in order from okay to best
* lock down socket library and allow pluggable option
* tests
  * simulate a distributed network with delay, ensure consistency
  * ensure rewind/reordering works
  * ensure API
* example application, something real-time, event driven, social.

## contributions

Contributions very welcomed. *This project is still in its very early,
experimental stages.*

A major aim of this project is to be able to drop this middleware into an
existing, compatible project and have it "just work". Additional features
(timestamp strategy, streams and encryption) should be configurable in
redux-scuttlebutt and still maintain the core redux structure/architecture

## licence

MIT. Without open source projects like React, Redux, Scuttlebutt, and all the
amazing libraries which have been an inspiration for this project, many
wonderful things in this world wouldn't exist. So, thank you.
