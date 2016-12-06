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
