const User = require('../models/userModel')
const Room = require('../models/roomModel')
const Category = require('../models/categoryModel')

const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const generateRTC = require('./generateRTC')

let acknowledged = []
exports.socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake?.auth?.token
        if (!token) {
            return next(new Error('You are not logged in'))
        }

        const decoded = await promisify(jwt.verify)(
            token,
            process.env.JWT_SECRET
        )

        const currentUser = await User.findOne({
            _id: decoded.id,
            active: true,
        })
        if (!currentUser) {
            return next(
                new Error(
                    'The user belonging to this token does no longer exist'
                )
            )
        }

        //Check if user changed password after token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return next(
                new Error(
                    'User recently changed the password! Please log in again'
                )
            )
        }

        socket.user = {
            name: currentUser.name,
            photo: currentUser.photo,
            _id: currentUser._id,
            uid: currentUser.uid,
        }

        next()
    } catch (err) {
        next(err)
    }
}

exports.socketIOHandler = function (io) {
    return (socket) => {
        console.log('client connected: ' + socket.id)
        socket.user.socketId = socket.id

        socket.on('error', (err) => {
            if (err) {
                socket.disconnect()
            }
        })

        socket.on('createRoom', async (roomData) => {
            if (!~acknowledged.indexOf(socket.user._id)) {
                acknowledged.unshift(socket.user._id)

                if (acknowledged.length > 1000) {
                    acknowledged.length = 1000
                }

                const { name, category, status } = roomData

                if (!name || !category || !status) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'name, categoy and status are required'
                    )
                    return
                }

                try {
                    const categoryData = await Category.findOne({
                        name: category,
                    })

                    if (!categoryData) {
                        io.to(socket.id).emit(
                            'errorMessage',
                            'There is no category with that name'
                        )
                        return
                    }

                    const room = await Room.create({
                        name,
                        admin: socket.user._id,
                        category,
                        status,
                    })

                    console.log(
                        `user ${socket.user.name} created Room ${room.name}`
                    )

                    socket.join(room.name)
                    const timerId = setTimeout(async () => {
                        const sockets = await io
                            .in(existingRoom.name)
                            .fetchSockets()
                        if (sockets.length > 0) {
                            io.to(existingRoom.name).emit('roomEnded')
                            io.in(existingRoom.name).disconnectSockets(true)
                        }
                    }, 18000000)

                    const updatedRoom = await Room.findOneAndUpdate(
                        { name: room.name },
                        { timerId },
                        {
                            new: true,
                            runValidators: true,
                        }
                    ).lean()

                    socket.user.roomName = updatedRoom.name

                    const token = generateRTC(socket.user, true)

                    updatedRoom.APP_ID = process.env.APP_ID

                    io.to(socket.id).emit(
                        'createRoomSuccess',
                        socket.user,
                        updatedRoom,
                        token
                    )
                } catch (error) {
                    console.log(error)
                    let message = "Couldn't create room"
                    if (error.kind === 'ObjectId')
                        message = `Invalid ${error.path}: ${error.value}`

                    if (error.message.toLowerCase().includes('agora')) {
                        message = 'agora token failed'
                    }
                    if (error.code === 11000)
                        message = `Duplicate field value: ${JSON.stringify(
                            error.keyValue
                        )}. Please use another value`

                    if (
                        error.message
                            .toLowerCase()
                            .includes('validation failed')
                    ) {
                        const errors = Object.values(error.errors).map(
                            (el) => el.message
                        )

                        message = `Invalid input data. ${errors.join('. ')}`
                    }
                    io.to(socket.id).emit('errorMessage', message)
                    return
                }
            } else {
                io.to(socket.id).emit('errorMessage', 'You are already in room')
            }
        })

        socket.on('joinRoom', async (roomName) => {
            if (!~acknowledged.indexOf(socket.user._id)) {
                acknowledged.unshift(socket.user._id)

                if (acknowledged.length > 1000) {
                    acknowledged.length = 1000
                }

                if (!roomName || typeof roomName !== 'string') {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'Please enter a valid room name'
                    )
                    acknowledged = acknowledged.filter(
                        (userId) => userId !== socket.user._id
                    )
                    return
                }

                try {
                    const existingRoom = await Room.findOne({
                        name: roomName,
                    })

                    if (!existingRoom) {
                        io.to(socket.id).emit('errorMessage', 'room not found')

                        acknowledged = acknowledged.filter(
                            (userId) => userId !== socket.user._id
                        )
                        return
                    }

                    if (
                        existingRoom.audience.includes(
                            socket.user._id.toString()
                        ) ||
                        existingRoom.brodcasters.includes(
                            socket.user._id.toString()
                        ) ||
                        existingRoom.admin.toString() ===
                            socket.user._id.toString()
                    ) {
                        io.to(socket.id).emit(
                            'errorMessage',
                            'tried to join room twice'
                        )
                        acknowledged = acknowledged.filter(
                            (userId) => userId !== socket.user._id
                        )

                        return
                    }

                    const room = await Room.findOneAndUpdate(
                        { name: roomName },
                        {
                            $push: { audience: socket.user._id },
                        },
                        {
                            new: true,
                            runValidators: true,
                        }
                    )
                        .populate({
                            path: 'admin',
                            select: 'name photo uid',
                        })
                        .populate({
                            path: 'audience',
                            select: 'name photo uid',
                        })
                        .populate({
                            path: 'brodcasters',
                            select: 'name photo uid',
                        })
                        .lean()
                    socket.user.roomName = room.name

                    const token = generateRTC(socket.user, false)

                    console.log(
                        `${socket.user.name} Joined ${socket.user.roomName}`
                    )

                    socket.join(room.name)

                    room.APP_ID = process.env.APP_ID

                    io.to(socket.id).emit(
                        'joinRoomSuccess',
                        socket.user,
                        room,
                        token
                    )

                    socket.to(room.name).emit('userJoined', socket.user)
                } catch (error) {
                    console.log(error)
                    let message = "Couldn't join room"
                    if (error.kind === 'ObjectId')
                        message = `Invalid ${error.path}: ${error.value}`

                    if (error.message.toLowerCase().includes('agora')) {
                        message = 'agora token failed'
                    }
                    if (error.code === 11000)
                        message = `Duplicate field value: ${JSON.stringify(
                            error.keyValue
                        )}. Please use another value`

                    if (
                        error.message
                            .toLowerCase()
                            .includes('validation failed')
                    ) {
                        const errors = Object.values(error.errors).map(
                            (el) => el.message
                        )

                        message = `Invalid input data. ${errors.join('. ')}`
                    }
                    io.to(socket.id).emit('errorMessage', message)

                    acknowledged = acknowledged.filter(
                        (userId) => userId !== socket.user._id
                    )

                    return
                }
            } else {
                io.to(socket.id).emit(
                    'errorMessage',
                    "can't join more than one room"
                )
            }
        })

        socket.on('adminReJoinRoom', async () => {
            try {
                const adminFoundInRoom = await Room.findOne({
                    admin: socket.user._id,
                })

                if (!adminFoundInRoom) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'No room found that you are admin in it'
                    )
                    return
                }
                const allSockets = await io
                    .in(adminFoundInRoom.name)
                    .fetchSockets()
                const userSocket = allSockets.find(
                    ({ user }) => user._id === socket.user._id
                )

                if (userSocket) {
                    console.log(
                        'userSocket ' + userSocket.id + ' will leave the room'
                    )
                    userSocket.leave(adminFoundInRoom.name)
                }

                const room = await Room.findOne({
                    name: adminFoundInRoom.name,
                })
                    .populate({
                        path: 'admin',
                        select: 'name photo uid',
                    })
                    .populate({
                        path: 'audience',
                        select: 'name photo uid',
                    })
                    .populate({
                        path: 'brodcasters',
                        select: 'name photo uid',
                    })
                    .lean()

                if (!room) {
                    io.to(socket.id).emit('errorMessage', 'No room found')
                    return
                }

                socket.user.roomName = adminFoundInRoom.name

                const token = generateRTC(socket.user, true)

                socket.join(socket.user.roomName)
                console.log(
                    `Admin ${socket.user.name} joined the room ${socket.user.roomName} again`
                )

                room.APP_ID = process.env.APP_ID

                io.to(socket.id).emit(
                    'adminReJoinedRoomSuccess',
                    socket.user,
                    room,
                    token
                )
            } catch (error) {
                console.log(error)
                io.to(socket.id).emit('errorMessage', "can't rejoin room")
            }
        })

        socket.on('askForPerms', () => {
            if (socket.user.roomName) {
                socket
                    .to(socket.user.roomName)
                    .emit('userAskedForPerms', socket.user)
            } else {
                io.to(socket.id).emit('errorMessage', 'no room specified')
            }
        })

        socket.on('givePermsTo', async (user) => {
            // check if there is a user object
            if (!user || !user._id) {
                io.to(socket.id).emit('errorMessage', 'user info not complete')
                return
            }
            // check if the emitter is the admin
            try {
                const { admin, audience, _id } = await Room.findOne({
                    name: socket.user.roomName,
                })
                    .select('admin audience')
                    .lean()

                if (!admin) {
                    io.to(socket.id).emit('errorMessage', 'room not found')
                    return
                }

                if (!(admin.toString() === socket.user._id.toString())) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'you are not the room admin'
                    )
                    return
                }

                const foundInAudience = audience.some(
                    (aud) => aud.toString() === user._id.toString()
                )
                if (!foundInAudience) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'user not in audience list'
                    )
                    return
                }

                const userData = await User.findById(user._id).select('uid')

                if (!userData) {
                    io.to(socket.id).emit('errorMessage', `User not found`)
                    return
                }

                user.uid = userData.uid

                const room = await Room.findOneAndUpdate(
                    { _id },
                    {
                        $pull: {
                            audience: user._id,
                        },

                        $push: {
                            brodcasters: user._id,
                        },
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )

                user.roomName = room.name

                const token = generateRTC(user, true)

                const allSockets = await io.in(room.name).fetchSockets()
                const userSocket = allSockets.find(({ user: userInSocket }) => {
                    return userInSocket._id.toString() === user._id.toString()
                })
                io.to(room.name).emit(
                    'userChangedToBrodcaster',
                    userSocket.user
                )
                io.to(userSocket.id).emit('brodcasterToken', token)
            } catch (error) {
                console.log(error)
                io.to(socket.id).emit('errorMessage', 'something went wrong')
            }
        })

        socket.on('weHaveToGoBack', async () => {
            try {
                if (socket.user.roomName && socket.user.socketId) {
                    const room = await Room.findOne({
                        name: socket.user.roomName,
                        brodcasters: socket.user._id,
                    })

                    if (!room) {
                        io.to(socket.id).emit('errorMessage', 'room not found')
                        return
                    }

                    await Room.updateOne(
                        { name: socket.user.roomName },
                        {
                            $pull: {
                                brodcasters: socket.user._id,
                            },

                            $push: {
                                audience: socket.user._id,
                            },
                        }
                    )

                    const token = generateRTC(socket.user, false)

                    io.to(socket.user.roomName).emit(
                        'userChangedToAudience',
                        socket.user
                    )
                    io.to(socket.user.socketId).emit('audienceToken', token)
                }
            } catch (error) {
                console.log(error)
                io.to(socket.id).emit('errorMessage', 'something went wrong')
            }
        })

        socket.on('takeAwayPermsFrom', async (user) => {
            try {
                // check if there is a user object
                if (!user || !user._id) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'user info not complete'
                    )
                    return
                }

                // check if the emitter is the admin
                const { admin, brodcasters, _id } = await Room.findOne({
                    name: socket.user.roomName,
                })
                    .select('admin brodcasters')
                    .lean()

                if (!admin) {
                    io.to(socket.id).emit('errorMessage', 'room not found')
                    return
                }

                if (!(admin.toString() === socket.user._id.toString())) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'you are not the room admin'
                    )
                    return
                }

                const foundInBrodcasters = brodcasters.some(
                    (brod) => brod.toString() === user._id.toString()
                )
                if (!foundInBrodcasters) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'user is not in brodcasters list'
                    )
                    return
                }

                const userData = await User.findById(user._id).select('uid')

                if (!userData) {
                    io.to(socket.id).emit('errorMessage', `User not found`)
                    return
                }

                user.uid = userData.uid

                const room = await Room.findOneAndUpdate(
                    { _id },
                    {
                        $pull: {
                            brodcasters: user._id,
                        },

                        $push: {
                            audience: user._id,
                        },
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )

                user.roomName = room.name
                const token = generateRTC(user, false)

                const allSockets = await io.in(room.name).fetchSockets()
                const userSocket = allSockets.find(({ user: userInSocket }) => {
                    return userInSocket._id.toString() === user._id.toString()
                })
                io.to(room.name).emit('userChangedToAudience', userSocket.user)
                io.to(userSocket.id).emit('audienceToken', token)
            } catch (error) {
                console.log(error)
                io.to(socket.id).emit('errorMessage', 'something went wrong')
            }
        })

        socket.on('endRoom', async () => {
            try {
                console.log(
                    `User ${socket.user.name} is trying to end the room ${socket.user.roomName}`
                )
                const existingRoom = await Room.findOne({
                    name: socket.user.roomName,
                })
                if (existingRoom) {
                    if (
                        socket.user._id.toString() ===
                        existingRoom.admin.toString()
                    ) {
                        console.log(`room ${existingRoom.name} Ended`)
                        io.to(existingRoom.name).emit('roomEnded')
                        io.in(socket.user.roomName).disconnectSockets(true)
                        try {
                            console.log(
                                `timerId will be deleted ${existingRoom.timerId} for room ${existingRoom.name}`
                            )
                            clearTimeout(existingRoom.timerId)
                            await Room.deleteOne({
                                name: socket.user.roomName,
                            })
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
            } catch (error) {
                console.log(error)
                io.to(socket.id).emit('errorMessage', 'something went wrong')
            }
        })

        socket.on('disconnecting', async () => {
            try {
                acknowledged = acknowledged.filter(
                    (userId) => userId !== socket.user._id
                )
                const existingRoom = await Room.findOne({
                    name: socket.user.roomName,
                })
                console.log(`user ${socket.user.name} disconnected`)
                if (existingRoom) {
                    if (
                        socket.user._id.toString() ===
                        existingRoom.admin.toString()
                    ) {
                        io.to(existingRoom.name).emit('adminLeft')
                        console.log(
                            `admin ${socket.user.name} left room ${existingRoom.name}`
                        )
                        setTimeout(async () => {
                            try {
                                const roomStatus = await Room.findById(
                                    existingRoom._id
                                ).lean()

                                if (!roomStatus) {
                                    return
                                }

                                const allSockets = await io
                                    .in(roomStatus.name)
                                    .fetchSockets()
                                const userSocket = allSockets.find(
                                    ({ user }) => {
                                        return (
                                            user._id.toString() ===
                                            roomStatus.admin.toString()
                                        )
                                    }
                                )

                                if (!userSocket) {
                                    io.to(roomStatus.name).emit('roomEnded')
                                    io.in(roomStatus.name).disconnectSockets(
                                        true
                                    )
                                    console.log(
                                        `timerId will be deleted ${roomStatus.timerId} for room ${roomStatus.name}`
                                    )
                                    clearTimeout(roomStatus.timerId)
                                    await Room.deleteOne({
                                        name: roomStatus.name,
                                    })
                                }
                            } catch (err) {
                                console.log(err)
                            }
                        }, 60000)
                    } else {
                        io.to(existingRoom.name).emit('userLeft', socket.user)
                        console.log(
                            `user ${socket.user.name} left room ${existingRoom.name}`
                        )
                        await Room.updateOne(
                            { _id: existingRoom._id },
                            {
                                $pull: {
                                    audience: socket.user._id,
                                    brodcasters: socket.user._id,
                                },
                            }
                        )
                    }
                }
            } catch (error) {
                console.log(error)
            }
        })
    }
}
