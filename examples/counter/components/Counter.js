import React, { Component, PropTypes } from 'react'

class Counter extends Component {
  constructor(props) {
    super(props)
    this.incrementAsync = this.incrementAsync.bind(this)
  }

  incrementAsync() {
    setTimeout(this.props.onIncrement, 1000)
  }

  render() {
    const { value, onIncrement, onDecrement, onIncrementOdd, onStressTest } = this.props
    return (
      <p>
        Clicked: {value} times
        {' '}
        <button onClick={onIncrement}>
          +
        </button>
        {' '}
        <button onClick={onDecrement}>
          -
        </button>
        {' '}
        <button onClick={onIncrementOdd}>
          Increment if odd
        </button>
        {' '}
        <button onClick={this.incrementAsync}>
          Increment async
        </button>
        {' '}
        <button onClick={(ev) => onStressTest(25, 250, ev)}>
          Causal (25x)
        </button>
        {' '}
        <button onClick={(ev) => onStressTest(1000, 250, ev)}>
          Causal (1,000x)
        </button>
        {' '}
        <button onClick={(ev) => onStressTest(100, 32, ev)}>
          Stress (100x)
        </button>
        {' '}
        <button onClick={(ev) => onStressTest(1000, 32, ev)}>
          Stress (1,000x)
        </button>
      </p>
    )
  }
}

Counter.propTypes = {
  value: PropTypes.number.isRequired,
  onIncrement: PropTypes.func.isRequired,
  onDecrement: PropTypes.func.isRequired,
  onIncrementOdd: PropTypes.func.isRequired,
  onStressTest: PropTypes.func.isRequired
}

export default Counter
