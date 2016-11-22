import tape from 'tape'
import Dispatcher, { REWIND_ACTION } from '../src/dispatcher'
import { reducer, sort, getState } from '../src/orderedHistory'

import {
  META_TIMESTAMP,
  META_SOURCE,
  UPDATE_TIMESTAMP,
  UPDATE_SOURCE,
} from '../src/constants'

function createAction(payload, timestamp, source) {
  return ({
    type: 'ACTION',
    payload: payload,
    meta: {
      [META_TIMESTAMP]: timestamp,
      [META_SOURCE]: source
    }
  })
}

tape('orderedHistory.sort', function (t) {

  t.ok(sort(1, 2, 'a', 'b') < 0, 't1 < t2')

  t.ok(sort(2, 1, 'a', 'b') > 0, 't2 > t1')

  t.ok(sort(2, 2, 'a', 'b') < 0, ' t2-s1 < t2-s2')

  t.ok(sort(2, 2, 'b', 'a') > 0, ' t2-s2 > t2-s1')

  t.end()
})

tape('orderedHistory.getState', function (t) {
  const root = reducer((state, action) => action)
  var state1 = [], state2 = []

  state1 = root(state1, createAction('1a', 1, 'a'))
  state1 = root(state1, createAction('2a', 2, 'a'))
  state1 = root(state1, createAction('5a', 5, 'a'))

  state2 = root(state2, createAction('9a', 9, 'a'))
  state2 = root(state2, createAction('4a', 4, 'a'))

  t.equal(getState(state1).payload, '5a')

  t.equal(getState(state2).payload, '9a')

  t.end()
})

tape('orderedHistory.reducer ordering (simple)', function (t) {
  const root = reducer((state, action) => action)
  let state = []

  state = root(state, createAction(1, undefined, 'a'))
  state = root(state, createAction(1, 2, 'a'))
  state = root(state, createAction(1, 5, 'a'))
  state = root(state, createAction(1, 9, 'a'))
  state = root(state, createAction(1, 4, 'a'))

  // should record the action
  t.equal(state.length, 5, 'state includes 5 items')

  // should be in order
  t.ok(state[0][UPDATE_TIMESTAMP] === undefined, '1 < 2')
  t.ok(state[1][UPDATE_TIMESTAMP] < state[2][UPDATE_TIMESTAMP], '2 < 4')
  t.ok(state[2][UPDATE_TIMESTAMP] < state[3][UPDATE_TIMESTAMP], '4 < 5')
  t.ok(state[3][UPDATE_TIMESTAMP] < state[4][UPDATE_TIMESTAMP], '5 < 8')

  t.end()
})

tape('orderedHistory.reducer ordering (complex)', function (t) {
  const root = reducer((state = [], action) => [...state, action])
  let state = []

  // maintain order
  state = root(state, createAction(1, 4, 'a'))
  state = root(state, createAction(1, 5, 'c'))

  // a stays at [2], c moves to end [5]
  state = root(state, createAction(1, 10, 'a'))
  state = root(state, createAction(1, 11, 'c'))

  // 10 moves to [3], 11 moves to before 11-c
  state = root(state, createAction(1, 10, 'b'))
  state = root(state, createAction(1, 11, 'b'))

  // should be [ 4-a, 5-c, 10-a, 10-b, 11-b, 11-c ]

  t.ok(state[0][UPDATE_TIMESTAMP] < state[1][UPDATE_TIMESTAMP], 't0 < t1')

  t.ok(state[2][UPDATE_TIMESTAMP] === state[3][UPDATE_TIMESTAMP], 't2 === t2')
  t.ok(state[2][UPDATE_SOURCE] < state[3][UPDATE_SOURCE], 's0 < s1')

  t.ok(state[4][UPDATE_TIMESTAMP] === state[5][UPDATE_TIMESTAMP], 't3 === t3')
  t.ok(state[4][UPDATE_SOURCE] < state[5][UPDATE_SOURCE], 's1 < s2')

  t.end()
})
