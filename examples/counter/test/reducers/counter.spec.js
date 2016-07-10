import expect from 'expect'
import { counter } from '../../reducers'

describe('reducers', () => {
  describe('counter', () => {
    it('should provide the initial state', () => {
      expect(counter(undefined, {})).toBe(0)
    })

    it('should handle INCREMENT action', () => {
      expect(counter(1, { type: 'INCREMENT' })).toBe(2)
    })

    it('should handle DECREMENT action', () => {
      expect(counter(1, { type: 'DECREMENT' })).toBe(0)
    })

    it('should handle INCREMENT_ODD action', () => {
      expect(counter(1, { type: 'INCREMENT_ODD' })).toBe(2)
    })

    it('should not handle INCREMENT_ODD action if even', () => {
      expect(counter(2, { type: 'INCREMENT_ODD' })).toBe(2)
    })

    it('should ignore unknown actions', () => {
      expect(counter(1, { type: 'unknown' })).toBe(1)
    })
  })
})
