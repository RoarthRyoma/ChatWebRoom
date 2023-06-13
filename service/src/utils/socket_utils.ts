import type { Socket } from 'socket.io'
import { Server } from 'socket.io'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { v4 as uuidv4 } from 'uuid'

interface RoomDictionary {
  [roomId: string]: Room
}

interface UserDictionary {
  [username: string]: UserConnection
}

interface Room {
  uuid: string // 实际注册在Socket.rooms里的房间
  roomName: string // 实际给用户显示的房间名
  users: UserConnection[] // 在Socket.rooms里的连接实例数组
}

interface UserConnection {
  socketId: string // 与服务端连接后的实例连接标识符
  roomId: string // 和Room类的uuid对应
  username: string // 用户昵称
}

interface JoinRoomResponse {
  code: number // 0-成功， 1-失败
  roomId: string // 房间存在则返回房间id, 不存在则创建后返回房间id
  roomName: string // 加入已存在的房间时则返回房间名
}

const ChatRoomDic: RoomDictionary = {}
const UsersDic: UserDictionary = {}

function socketIoHandle(_io: Server, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
  socket.on('joinRoom', (data) => {
    globalThis.console.log('join room: ', data)
    const roomId = data.roomId
    const room = ChatRoomDic[roomId]
    if (room) {
      // 房间存在，加入房间
      socket.join(roomId)
      const userConnection: UserConnection = {
        socketId: socket.id,
        roomId,
        username: data.user.username,
      }
      room.users.push(userConnection) // 更新房间的用户列表
      UsersDic[data.user.username] = userConnection
      // 向房间内的所有用户(包括自己)广播一条消息，通知有新用户加入
      // _io.to(roomId).emit('userJoined', { username: data.user.username })
      socket.broadcast.to(roomId).emit('userJoined', { username: data.user.username })

      const res: JoinRoomResponse = {
        code: 0,
        roomId,
        roomName: room.roomName,
      }
      socket.emit('joinRoomResponse', res)
    }
    else {
      // 房间不存在，创建房间并返回分配的房间号
      const newRoomId = uuidv4()
      const room: Room = {
        uuid: newRoomId,
        roomName: data.roomName,
        users: [],
      }
      const userConnection: UserConnection = {
        socketId: socket.id,
        roomId: newRoomId,
        username: data.user.username,
      }
      room.users.push(userConnection) // 将新用户的连接信息添加到 UserConnection 数组中
      UsersDic[data.user.username] = userConnection
      ChatRoomDic[newRoomId] = room
      socket.join(newRoomId)
      const res: JoinRoomResponse = {
        code: 0,
        roomId: newRoomId,
        roomName: data.roomName,
      }
      socket.emit('joinRoomResponse', res)
    }
    globalThis.console.log('roomDic: ', JSON.stringify(ChatRoomDic))
  })

  socket.on('leaveRoom', (data) => {
    globalThis.console.log('leave room: ', data)
    const { roomId, nickName } = data
    // globalThis.console.log(`nickName: ${nickName} roomId: ${roomId}`)
    const room = ChatRoomDic[roomId]
    if (room) {
      // 向房间内的其他用户广播一条消息，通知有用户离开
      socket.broadcast.to(roomId).emit('userLeft', { username: nickName })
      // 房间存在，离开房间
      socket.leave(roomId)
      // 从房间的用户列表中移除当前用户
      room.users = room.users.filter(user => user.username !== nickName)
      // globalThis.console.log(`User ${nickName} left room: ${roomId}`)
      // 如果房间没有其他用户，删除房间
      if (room.users.length === 0)
        delete ChatRoomDic[roomId]
        // globalThis.console.log(`Room ${roomId} is deleted`)
    }
    globalThis.console.log('someone left rooms: ', JSON.stringify(socket.rooms))
    globalThis.console.log('someone left roomDic: ', JSON.stringify(ChatRoomDic))
  })

  socket.on('reconnect', (data) => {
    const userConnection = UsersDic[data.username]
    if (userConnection) {
      userConnection.socketId = socket.id
      socket.join(userConnection.roomId)
    }
  })

  socket.on('disconnect', (reason) => {
    globalThis.console.log(`Client disconnected. Socket id: ${socket.id}, Reason: ${reason}`)
    let disconnectedUser: UserConnection | undefined
    for (const room of Object.values(ChatRoomDic)) {
      disconnectedUser = room.users.find(user => user.socketId === socket.id)
      if (disconnectedUser) {
        // 从房间的用户列表中移除断开连接的用户
        // room.users = room.users.filter(user => user.socketId !== socket.id)
        // 广播 userDisconnected 事件，将断开连接的用户的 username 和 roomId 作为事件数据发送出去
        socket.broadcast.to(room.uuid).emit('userDisconnected', { username: disconnectedUser.username, roomId: room.uuid, reason })
      }
    }
  })

  socket.on('receiveMessage', (data) => {
    globalThis.console.log('receive: ', data)
    const room = ChatRoomDic[data.roomId]
    if (room) {
      // 将消息发送给房间内的所有其他用户
      socket.broadcast.to(data.roomId).emit('sendMessage', data)
      globalThis.console.log('do receiveMessage: ', data)
    }
  })

  socket.on('sendMessage', (data) => {
    globalThis.console.log('send: ', data)
    const room = ChatRoomDic[data.roomId]
    if (room) {
      // 将消息发送给房间内的所有用户
      // _io.to(data.roomId).emit('receiveMessage', data)
      socket.broadcast.to(data.roomId).emit('receiveMessage', data)
      // globalThis.console.log('do sendMessage: ', data)
      globalThis.console.log('now roomDic: ', ChatRoomDic)
    }
    else {
      _io.to(socket.id).emit('roomNotExist', { message: 'The room where you sent the message has been closed. Please create another one.' })
      globalThis.console.log(`This room does not exist. data: [${data}]`)
    }
  })
}

export async function setupSocketIO(server) {
  const _io = new Server(server, {
    allowEIO3: true,
    cors: {
      origin: process.env.FRONTEND_URL, // 前端地址
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  _io.on('connection', (socket) => {
    socket.conn.once('upgrade', () => {
      // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
      globalThis.console.log('upgraded transport', socket.conn.transport.name) // prints "websocket"
    })

    socket.conn.on('packet', ({ type, data }) => {
      // called for each packet received
      globalThis.console.log(`${socket.id} packet received, type: ${type}, data: ${data}`)
    })

    socket.conn.on('packetCreate', ({ type, data }) => {
      // called for each packet sent
      globalThis.console.log(`${socket.id} packet created, next to sent, type: ${type}, data: ${data}`)
    })

    socket.conn.on('drain', () => {
      // called when the write buffer is drained
      globalThis.console.log(`${socket.id} write buffer is drained.`)
    })

    socket.conn.on('close', (reason) => {
      // called when the underlying connection is closed
      globalThis.console.log(`${socket.id} is closed, reason: ${reason}`)
    })
    globalThis.console.log(`${socket.id} connected, current data: ${JSON.stringify(socket.data)}`)
    socketIoHandle(_io, socket)
  })

  return _io
}
