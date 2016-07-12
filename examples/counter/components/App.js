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
              type: (n =>
                n > 0.8 ? 'INCREMENT_ODD' : n > 0.4 ? 'DECREMENT' : 'INCREMENT'
              )(Math.random())
            })

            tick()

            // the remaining are dispatched over time
            for(let i = amount; i > 0; i--) {
              setTimeout(tick, i * 32)
              if (i % 3 === 0) setTimeout(tick, i-- * 32) // fizz
              if (i % 5 === 0) setTimeout(tick, i-- * 32) // buzz
              if (i % 7 === 0) setTimeout(tick, i-- * 32) // freebie
            }
          }}
        />

      <hr />

      <ol reversed>
      {
        state.log.reduceRight((list, log) =>
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
