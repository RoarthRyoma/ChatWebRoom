import io from 'socket.io-client'

const socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
  withCredentials: true,
  query: {},
  transports: ['websocket', 'polling'],
})

export default socket
