// keys added to the action's meta property
export const META_TIMESTAMP = '@@scuttlebutt/TIMESTAMP'
export const META_SOURCE = '@@scuttlebutt/SOURCE'

// update and state history structure keys
// currently, the UPDATE_ and STATE_ indexes should match for history filtering
export const UPDATE_ACTION = 0,
  UPDATE_TIMESTAMP = 1,
  UPDATE_SOURCE = 2,
  STATE_ACTION = 0,
  STATE_TIMESTAMP = 1,
  STATE_SOURCE = 2,
  STATE_SNAPSHOT = 3
