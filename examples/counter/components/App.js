import React, { Component, PropTypes } from 'react'
import Counter from './Counter'

export default function App({ store: { dispatch, getState } }) {
  // const { dispatch, getState } = store
  const state = getState()

  return (
    <div>
      <Counter
          value={state.counter}
          onIncrement={() => dispatch({ type: 'INCREMENT' })}
          onDecrement={() => dispatch({ type: 'DECREMENT' })}
          onIncrementOdd={() => dispatch({ type: 'INCREMENT_ODD' })}
          onStressTest={(amount = 1) => {
            const tick = () => dispatch({
              type: (Math.random() > 0.5 ? 'DECREMENT' : 'INCREMENT')
            })

            // the first 20 are dispatched immediately
            for(let i = Math.min(amount, 20); i > 0; i--) {
              tick()
            }

            // the remaining are dispatched over time
            for(let i = amount - 20; i > 0; i--) {
              setTimeout(tick, i * 32)
            }
          }}
        />

      <hr />

      <ol reversed>
      {
        state.io.log.reduceRight((list, log) =>
          list.concat(<li><pre>{ JSON.stringify(log) }</pre></li>),
        [])
      }
      </ol>
    </div>
  )
}

App.propTypes = {
  store: PropTypes.object.isRequired
}
