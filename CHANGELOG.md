
# 0.2.0

* **Breaking change** `timestamp` is now *logical*. This means it has no
  relationship with wall-clock time.
  * Updates are now strictly sorted by [timestamp, source].
* Tests for orderedHistory
* Stores and replays scuttlebutt updates in timestamp-source order, not received order
  * True to the original paper, better in high-latency situations
* Create new scuttlebutt streams for re-connections
  * Increases reconnection reliability
* Adds option function `isGossipType`
* Don't explode on actions without a `meta` property. This fixes the chat example.

# <0.1

Inital releases.
