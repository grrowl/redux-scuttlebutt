import React, { Component, PropTypes } from 'react'

const styles = {
  container: {
    listStyle: 'none',
    padding: 0,
  },
  item: {
    display: 'flex',
    justifyContent: 'flex-start',
    borderBottom: '1px solid lightgrey'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  source: {
    // Hack, but stops flexbox from stretching
    minWidth: 64,
    minHeight: 64,
    maxWidth: 64,
    maxHeight: 64,
    marginRight: '0.5rem',
  },
  timestamp: {
    color: 'darkgrey',
    fontFamily: 'monospace',
  },
  message: {
    fontSize: '1.4rem',
    fontFamily: 'monospace',
    flexShrink: 0
  }
}

function formatDate(date) {
  const pad2 = (str) => ('00' + str).slice(-2)
  return [
    ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat'][date.getDay()],
    ' ',
    pad2(date.getHours()), ':',
    pad2(date.getMinutes()), ':',
    pad2(date.getSeconds())
  ].join('')
}

class MessageList extends Component {

  render() {
    const { messages } = this.props

    return (
      <ol reversed style={ styles.container }>
      {
        messages.reduceRight((list, { message, source, timestamp }, i) => list.concat(
          <li key={ i } style={ styles.item }>
            <img
              style={ styles.source }
              src={ `https://robohash.org/${source}.png?size=64x64&set=set3` }
              alt={ `Sent by: ${source}` } />
            <div style={ styles.content }>
              <div style={ styles.timestamp }>
                { formatDate(new Date(timestamp)) }
              </div>
              <div style={ styles.message }>
                { message }
              </div>
            </div>
          </li>
        ), [])
      }
      </ol>
    )
  }
}

MessageList.propTypes = {
  messages: PropTypes.array.isRequired
}

export default MessageList
