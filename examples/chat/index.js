import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, compose, applyMiddleware } from 'redux'
import App from './components/App'
import counter from './reducers'
import scuttlebutt from 'redux-scuttlebutt'

const enhancer = compose(
  scuttlebutt(),
  window.devToolsExtension ? window.devToolsExtension() : f => f,
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
