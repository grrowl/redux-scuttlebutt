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
          onStressTest={(amount = 1, delay = 32) => {
            const tick = () => dispatch({
              type: ((n = Math.random()) =>
                n > 0.8 ? 'INCREMENT_ODD' : n > 0.4 ? 'DECREMENT' : 'INCREMENT'
              )()
            })

            tick()

            // the remaining are dispatched over time
            for(let i = amount; i > 0; i--) {
              setTimeout(tick, i * delay)
              if (i % 3 === 0) setTimeout(tick, i-- * delay) // fizz
              if (i % 5 === 0) setTimeout(tick, i-- * delay) // buzz
              if (i % 7 === 0) setTimeout(tick, i-- * delay) // freebie
            }
          }}
        />

      <hr />

      <ol reversed>
      {
        state.log.reduceRight((list, log, i) =>
          list.concat(<li key={ i }><pre>{ JSON.stringify(log) }</pre></li>),
        [])
      }
      </ol>
    </div>
  )
}

App.propTypes = {
  store: PropTypes.object.isRequired
}
