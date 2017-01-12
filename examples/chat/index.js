import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, compose, applyMiddleware } from 'redux'
import App from './components/App'
import counter from './reducers'
import scuttlebutt, { devToolsStateSanitizer } from 'redux-scuttlebutt'

const devToolsConfig = {
  stateSanitizer: devToolsStateSanitizer
}

const enhancer = compose(
  applyMiddleware(scuttlebutt),
  window.devToolsExtension ? window.devToolsExtension(devToolsConfig) : f => f,
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
