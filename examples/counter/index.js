import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, compose, applyMiddleware } from 'redux'
import Counter from './components/Counter'
import App from './components/App'
import counter from './reducers'
import scuttlebutt, { devToolsStateSanitizer } from 'redux-scuttlebutt'

const devToolsConfig = {
  stateSanitizer: devToolsStateSanitizer
}

const enhancer = compose(
  scuttlebutt(),
  window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__(devToolsConfig)
    : f => f
)

const store = createStore(counter, undefined, enhancer)

const rootEl = document.getElementById('root')

function render() {
  ReactDOM.render(
    <App store={ store } />,
    rootEl
  )
}

render()
store.subscribe(render)
