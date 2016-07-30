import React, { Component, PropTypes } from 'react'
import MessageInput from './MessageInput'
import MessageList from './MessageList'

function filterActive(sources) {
  let active = 0,
    activeHorizon = new Date().getTime() - 15 * 60 * 1000 // 15 minutes ago

  for (const i in sources) {
    if (sources[i] > activeHorizon)
      active++
  }

  return active
}

export default function App({ store: { dispatch, getState } }) {
  const { messages, sources } = getState()

  return (
    <div>
      <MessageInput
        online={ filterActive(sources) }
        onMessage={(payload) => dispatch({ type: 'ADD_MESSAGE', payload })} />

      <hr />

      <MessageList messages={ messages }/>
    </div>
  )
}

App.propTypes = {
  store: PropTypes.object.isRequired
}
