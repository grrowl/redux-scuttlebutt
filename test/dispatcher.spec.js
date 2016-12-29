import tape from 'tape'
import { spy } from 'sinon'

import Dispatcher from '../src/dispatcher'
import * as orderedHistory from '../src/orderedHistory'

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

tape('dispatcher({ verifyAsync })', function (t) {
  const
    invalid = ['new', 'yeah'], valid = ['what', 'up'],
    verifyAsync = (callback, action, getHistory) => {
      t.ok(Array.isArray(getHistory()), 'getHistory() returns an array')

      setTimeout(() => {
        // payloads containing 'e' are invalid
        if (action && action.payload && action.payload.indexOf('e') !== -1) {
          t.ok(invalid.includes(action.payload), 'invalid action is invalid')
          callback(false)
        } else {
          t.ok(action.payload && valid.includes(action.payload), 'valid action is valid')
          callback(true)
        }
      }, 5)
    },
    dispatcher = new Dispatcher({ verifyAsync }),
    dispatch = spy(),
    wrappedDispatch = dispatcher.wrapDispatch(dispatch),
    getState = spy(() => []) // becomes getHistory, returns array

  dispatcher.wrapGetState(getState)

  wrappedDispatch(createAction(invalid[0]))
  wrappedDispatch(createAction(invalid[1]))
  wrappedDispatch(createAction(valid[0]))
  wrappedDispatch(createAction(valid[1]))

  setTimeout(() => {
    t.ok(dispatch.calledTwice, 'called dispatch twice')
    // first call
    t.equal(dispatch.getCall(0).args[0].payload, valid[0], 'called dispatch with valid action 1')
    // second call
    t.equal(dispatch.getCall(1).args[0].payload, valid[1], 'called dispatch with valid action 2')
    t.equal(getState.callCount, 4, 'getState was called for each getHistory')
    t.end()
  }, 20)
})
