import React, { Component, PropTypes } from 'react'

const styles = {
  container: {
    padding: 0
  },
  input: {
    fontFamily: 'monospace',
    fontSize: '16px',
    lineHeight: 1.8,
    width: '100%',
    border: 0,
  }
}

class Message extends Component {
  constructor(props) {
    super(props)

    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  handleKeyDown(ev) {
    const { onMessage } = this.props

    if (ev.key === 'Enter' && ev.target.value) {
      onMessage(ev.target.value)

      // Prevent enter from reaching input, and clear its value
      ev.preventDefault()
      ev.target.value = ''
    }
  }

  render() {
    const { online, placeholder } = this.props

    return (
      <fieldset>
        <legend>anonchat { online ? `(${online} active)` : '' }</legend>
        <input
          style={ styles.input }
          type="text"
          placeholder={ placeholder }
          onKeyDown={ this.handleKeyDown }
          maxLength={ 255 }
          />
      </fieldset>
    )
  }
}

Message.propTypes = {
  placeholder: PropTypes.string,
  online: PropTypes.number,
  onMessage: PropTypes.func.isRequired
}

Message.defaultProps = {
  placeholder: 'What\'s on your mind?'
}

export default Message
