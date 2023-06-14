import { useChat } from './useChat'
import { useScroll } from './useScroll'
import { CHAT_FRIENDS } from '@/store'
import socket from '@/utils/request/socket'
// import { ss } from '@/utils/storage'

const { addChat } = useChat()
const { scrollToBottom } = useScroll()

export function useSocket() {
  // emit
  const emitJoinRoom = (roomId: string, roomName: string, user: { username: string }) => {
    socket.emit('joinRoom', { roomId, roomName, user })
  }

  const emitReConnect = (username: string) => {
    socket.emit('reconnect', { username })
  }

  const emitSendMessage = (roomId: string, nickname: string, avatar: string, message: string) => {
    socket.emit('sendMessage', { roomId, nickname, avatar, message })
  }

  // on
  const onConnect = () => {
    socket.off('connect')
    socket.on('connect', () => {
      globalThis.console.log(`WS connection status: [connected-${socket.connected}], [disconnected-${socket.disconnected}]`)
    })
  }

  const onJoinRoomResponse = (handleJoinRoomResponse: (arg0: any, arg1: string) => void, nickName: string) => {
    // 先移除之前的事件监听器
    socket.off('joinRoomResponse')
    // 异步监听服务器发送回来的响应数据
    socket.on('joinRoomResponse', data => handleJoinRoomResponse(data, nickName))
  }

  const onReceiveMessage = (currentRoomId: string, uuid: string | number, message: string, callback: () => void) => {
    socket.off('receiveMessage')
    // 接收服务器发送的消息
    socket.on('receiveMessage', async (data) => {
      if (data.roomId === currentRoomId) { // 确保只接收当前聊天室的消息
        addChat(
          +uuid,
          CHAT_FRIENDS,
          {
            avatar: data.avatar,
            nickName: data.nickname,
            dateTime: new Date().toLocaleString(),
            text: data.message,
            inversion: false,
            hasAvatar: true,
            isleft: true,
            error: false,
            conversationOptions: null,
            requestOptions: { prompt: message, options: null },
          },
        )
        // await nextTick(() => scrollToBottom())
        callback()
      }
    })
  }

  const onRoomNotExist = (dialog: { warning: (arg0: { title: string; content: string; positiveText: string }) => void }) => {
    socket.on('roomNotExist', (data) => {
      dialog.warning({
        title: 'Warning!',
        content: `${data.message}`,
        positiveText: 'Ok',
      })
    })
  }

  const onUserDisconnect = (ms: { info: (arg0: string) => void }) => {
    socket.on('userDisconnected', (data) => {
      // globalThis.console.log(`User disconnected. Username: ${data.username}, RoomId: ${data.roomId}, Reason: ${data.reason}`)
      ms.info(`User disconnected. Username: ${data.username}, RoomId: ${data.roomId}, Reason: ${data.reason}`)
      // 在这里更新你的应用状态，例如，从你的在线用户列表中移除断开连接的用户，并更新相关房间的状态
    })
  }

  const onUserJoined = (uuid: string | number) => {
    socket.off('userJoined')
    socket.on('userJoined', (data) => {
      // 添加一条新的聊天记录，表示有新用户加入
      // globalThis.console.log('joined: ', data)
      addChat(
        +uuid,
        CHAT_FRIENDS,
        {
          nickName: data.username,
          dateTime: new Date().toLocaleString(),
          text: `${data.username} joined the room`,
          inversion: false,
          hasAvatar: false,
          isleft: true,
          error: false,
          conversationOptions: null,
          requestOptions: { prompt: '', options: null },
        },
      )
      // ms.info(`${data.username} joined the room`)
      scrollToBottom()
    })
  }

  const onUserLeft = (uuid: string | number) => {
    socket.off('userLeft')
    socket.on('userLeft', (data) => {
      // 添加一条新的聊天记录，表示有用户离开
      addChat(
        +uuid,
        CHAT_FRIENDS,
        {
          nickName: data.username,
          dateTime: new Date().toLocaleString(),
          text: `${data.username} left the room`,
          inversion: false,
          hasAvatar: false,
          isleft: true,
          error: false,
          conversationOptions: null,
          requestOptions: { prompt: '', options: null },
        },
      )
      // ms.info(`${data.username} left the room`)
      scrollToBottom()
    })
  }

  // 当用户刷新页面或者重新打开页面时，手动调用 socket.connect() 方法来重新连接到服务器
  // 但添加房间时会频繁触发回调导致死循环
  const reconnect = (nickname: string | undefined, roomId: string | undefined) => {
    if (nickname && roomId) {
      socket.connect()
      emitReConnect(nickname)
    }
  }

  return {
    reconnect,
    emitJoinRoom,
    emitSendMessage,
    onConnect,
    onJoinRoomResponse,
    onReceiveMessage,
    onRoomNotExist,
    onUserDisconnect,
    onUserJoined,
    onUserLeft,
  }
}
