import tape from 'tape'
import { stub, spy } from 'sinon'

import Dispatcher from '../src/dispatcher'
import * as orderedHistory from '../src/orderedHistory'

import { UPDATE_SNAPSHOT } from '../src/constants'

import {
  META_TIMESTAMP,
  META_SOURCE,
  UPDATE_TIMESTAMP,
  UPDATE_SOURCE,
} from '../src/constants'

function createAction(payload, type = 'ACTION') {
  return ({
    type,
    payload: payload,
  })
}

tape('dispatcher.wrapDispatch', function (t) {
  const dispatcher = new Dispatcher(),
    dispatch = spy(),
    wrappedDispatch = dispatcher.wrapDispatch(dispatch)

  spy(dispatcher, 'localUpdate')

  const privateAction = createAction(1, '@@privateType'),
    publicAction = createAction(10, 'REAL_ACTION')

  wrappedDispatch(privateAction)
  wrappedDispatch(publicAction)

  t.ok(dispatch.calledWith(privateAction), 'dispatch called for gossip action')
  t.ok(dispatch.calledWith(privateAction), 'dispatch called for private action')

  t.ok(dispatch.calledTwice, 'dispatch called twice')
  t.ok(dispatcher.localUpdate.calledOnce, 'localUpdate called once')

  dispatcher.localUpdate.restore()

  t.end()
})

tape('dispatcher.wrapGetState (initialState)', function (t) {
  const dispatcher = new Dispatcher(),
    getState = () => orderedHistory.getInitialState(42)

  spy(orderedHistory, 'getState')

  // should call orderedHistory.getState for transform
  t.equal(dispatcher.wrapGetState(getState)(), 42, 'states are equal')

  t.ok(orderedHistory.getState.calledOnce, 'orderedHistory.getState called')

  orderedHistory.getState.restore();

  t.end()
})

tape('dispatcher.wrapInitialState', function (t) {
  const dispatcher = new Dispatcher(),
    initialState = { 'favs': 'dogs' },
    state = dispatcher.wrapInitialState(initialState)

  t.ok(orderedHistory.getState(state), 'getState is ok')
  t.equal(orderedHistory.getState(state).favs, 'dogs', 'favs is dogs')

  t.end()
})

tape('dispatcher.wrapReducer', function (t) {
  const dispatcher = new Dispatcher(),
    rootReducer = spy((state = [], action) => [ ...state, action.payload]),
    reducer = dispatcher.wrapReducer(rootReducer)

  let state = dispatcher.wrapInitialState(['hey'])

  state = reducer(state, createAction('new'))
  state = reducer(state, createAction('yeah'))

  t.ok(rootReducer.calledTwice, 'called rootReducer twice')

  t.equal(orderedHistory.getState(state).length, 3, 'should have three entries')
  t.equal(orderedHistory.getState(state)[1], 'new', '"new" should be the second entry')

  t.end()
})

// dispatcher.applyUpdate - scuttlebutt super, eh

// dispatcher.history - scuttlebutt, history(sources) reduces getState of
// gossips and seen actions acoording to sources

// dispatcher.localUpdate - scuttlebutt, calls super.localUpdate (which calls
// other internals)

// options.customDispatch (ensure signature)
// options.isGossipType (copy wrapDispatch)
// options.verifyAsync (ensure behaviour)
