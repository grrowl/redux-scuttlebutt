import React from 'react'
import { render } from 'react-dom'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import scuttlebutt from 'redux-scuttlebutt'
import App from './containers/App'
import reducer from './reducers'
import 'todomvc-app-css/index.css'

const store = createStore(reducer, undefined, scuttlebutt())

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
