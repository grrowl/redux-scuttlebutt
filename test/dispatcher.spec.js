import tape from 'tape'
import Dispatcher, { REWIND_ACTION } from '../src/dispatcher'

tape('Dispatcher.wrapDispatch', function (t) {
  const sb = new Dispatcher(),
    dispatch = sb.wrapDispatch(({ payload }) => payload)

  // should feel like a regular dispatch
  t.equal(dispatch({ type: 'hey', payload: 'hey' }), 'hey')

  // shouldn't mess with privates
  t.equal(dispatch({ type: '@@redux/INIT', payload: 'hey' }), 'hey')

  // should have saved one action (internal property)
  t.equal(sb._actions.length, 1)

  t.end()
})

tape('Dispatcher.wrapReducer', function (t) {
  const sb = new Dispatcher(),
    reducer = sb.wrapReducer(
      (state, { payload }) => [...state, payload]
    )

  let state = ['initial state']

  // normal actions should flow through
  t.deepLooseEqual(
    state = reducer(state, { type: 'SOME_ACTION', payload: 12 }),
    ['initial state', 12])

  t.deepLooseEqual(
    state = reducer(state, { type: 'SOME_ACTION', payload: 26 }),
    ['initial state', 12, 26])

  // and ignore private actions
  t.deepLooseEqual(
    state = reducer(state, { type: '@@redux/INIT', payload: 48 }),
    ['initial state', 12, 26, 48])

  t.deepLooseEqual(
    state = reducer(state, { type: 'SOME_ACTION', payload: 96 }),
    ['initial state', 12, 26, 48, 96])

  // and rewind into history
  t.deepLooseEqual(
    state = reducer(state, { type: REWIND_ACTION, payload: 2 }),
    ['initial state', 12, 26, 48, 96])

  t.end()
})
