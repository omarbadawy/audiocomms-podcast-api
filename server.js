const mongoose = require('mongoose')
const dotenv = require('dotenv')
const http = require('http')
const User = require('./models/userModel')
const Room = require('./models/roomModel')
const { Server } = require('socket.io')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const { cloudinaryConfig } = require('./utils/cloudinary')

process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION!!')
    console.log(err.name, err.message)
    process.exit(1)
})

dotenv.config()
const app = require('./app')

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: '*',
})

const DB = process.env.DATABASE

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => console.log('DB connection successful!'))

cloudinaryConfig()

const port = process.env.PORT || 3000

io.use(async (socket, next) => {
    try {
        const token = socket.handshake?.auth?.token
        if (!token) {
            return next(new Error('You are not logged in'))
        }

        const decoded = await promisify(jwt.verify)(
            token,
            process.env.JWT_SECRET
        )

        const currentUser = await User.findById(decoded.id)
        if (!currentUser) {
            return next(
                new Error(
                    'The user belonging to this token does no longer exist.'
                )
            )
        }

        //Check if user changed password after token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return next(
                new Error(
                    'User recently changed the password! Please log in again.'
                )
            )
        }

        socket.user = {
            id: currentUser._id,
            name: currentUser.name,
            photo: currentUser.photo,
        }

        next()
    } catch (err) {
        next(err)
    }
})

io.on('connection', (socket) => {
    // console.log(socket.user)
    console.log('client connected: ' + socket.id)
    socket.user.socketId = socket.id
    socket.on('joinRoom', async (roomData) => {
        const userRooms = Array.from(socket.rooms)
        if (userRooms.length > 1) {
            io.to(socket.id).emit('alreadyInRoom')
            return
        }

        if (roomData?._id) {
            const existingRoom = await Room.findById(roomData._id)

            if (!existingRoom) {
                io.to(socket.id).emit('roomNotFound')
                return
            }

            if (existingRoom.admin.toString() === socket.user.id.toString()) {
                let isTheAdminInRoom = await io
                    .in(existingRoom.name)
                    .fetchSockets()

                if (isTheAdminInRoom.length > 0) {
                    io.to(socket.id).emit('adminAlreadyInRoom')
                    return
                }

                socket.join(existingRoom.name)
                socket.user.roomName = existingRoom.name

                return
            }
            if (
                existingRoom.audience.includes(socket.user.id.toString()) ||
                existingRoom.brodcasters.includes(socket.user.id.toString())
            ) {
                io.to(socket.id).emit('triedToJoinRoomTwice')
                return
            }

            const room = await Room.findOneAndUpdate(
                { _id: roomData._id },
                {
                    $push: { audience: socket.user.id },
                },
                {
                    new: true,
                    runValidators: true,
                }
            )

            socket.user.roomName = room.name
            socket.join(room.name)

            socket.to(room.name).emit('userJoined', socket.user)
        }
    })

    socket.on('disconnecting', async () => {
        const existingRoom = await Room.findOne({ name: socket.user.roomName })
        if (existingRoom) {
            if (socket.user.id.toString() === existingRoom.admin.toString()) {
                io.in(socket.user.roomName).disconnectSockets(true)
                try {
                    await Room.findOneAndDelete({ name: socket.user.roomName })
                } catch (err) {
                    console.log(err)
                }
            }
        }
        console.log(socket.user) // the Set contains at least the socket ID
    })
})

const server = httpServer.listen(port, () => {
    console.log(`app running on port ${port}...........`)
})

process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION !!!!!!!!')
    console.log(err)
    server.close(() => {
        process.exit(1)
    })
})

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED, Shutting down gracefully')
    server.close(() => {
        console.log('Process Terminated')
    })
})
