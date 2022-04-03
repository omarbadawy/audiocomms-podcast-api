const User = require('../models/userModel')
const Room = require('../models/roomModel')
const Category = require('../models/categoryModel')

const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const generateRTC = require('./generateRTC')

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

        const currentUser = await User.findById(decoded.id)
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
            id: currentUser._id,
            name: currentUser.name,
            photo: currentUser.photo,
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
            const { name, category, status } = roomData

            const userRooms = Array.from(socket.rooms)
            if (userRooms.length > 1) {
                io.to(socket.id).emit('errorMessage', 'already in room')
                return
            }

            if (!name || !category || !status) {
                io.to(socket.id).emit(
                    'errorMessage',
                    'name, categoy and status are required'
                )
                return
            }

            try {
                const categoryData = await Category.findOne({ name: category })

                if (!categoryData) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'There is no category with that name'
                    )
                    return
                }

                const room = await Room.create({
                    name,
                    admin: socket.user.id,
                    category,
                    status,
                    isActivated: true,
                })

                socket.join(room.name)
                socket.timerId = setTimeout(async () => {
                    const sockets = await io
                        .in(existingRoom.name)
                        .fetchSockets()
                    if (sockets.length > 0) {
                        io.to(existingRoom.name).emit('roomEnded')
                        io.in(existingRoom.name).disconnectSockets(true)
                    }
                }, 18000000)
                socket.user.roomName = room.name
                const token = generateRTC(socket.user.roomName, true)
                io.to(socket.id).emit(
                    'createRoomSuccess',
                    socket.user,
                    room,
                    token
                )
            } catch (error) {
                let message = "Couldn't create room"
                if (error.kind === 'ObjectId')
                    message = `Invalid ${error.path}: ${error.value}`

                if (error.code === 11000)
                    message = `Duplicate field value: ${JSON.stringify(
                        error.keyValue
                    )}. Please use another value`

                if (error.message.includes('validation failed')) {
                    const errors = Object.values(error.errors).map(
                        (el) => el.message
                    )

                    message = `Invalid input data. ${errors.join('. ')}`
                }
                io.to(socket.id).emit('errorMessage', message)
                return
            }
        })

        socket.on('joinRoom', async (roomName) => {
            const userRooms = Array.from(socket.rooms)
            if (userRooms.length > 1) {
                io.to(socket.id).emit('errorMessage', 'already in room')
                return
            }

            if (roomName) {
                const existingRoom = await Room.findOne({ name: roomName })

                if (!existingRoom) {
                    io.to(socket.id).emit('errorMessage', 'room not found')
                    return
                }

                console.log('socket user id', socket.user.id)

                if (
                    existingRoom.audience.includes(socket.user.id.toString()) ||
                    existingRoom.brodcasters.includes(
                        socket.user.id.toString()
                    ) ||
                    existingRoom.admin.toString() === socket.user.id.toString()
                ) {
                    io.to(socket.id).emit(
                        'errorMessage',
                        'tried to join toom twice'
                    )
                    return
                }

                const room = await Room.findOneAndUpdate(
                    { name: roomName },
                    {
                        $push: { audience: socket.user.id },
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )
                    .populate({
                        path: 'admin',
                        select: 'name photo',
                    })
                    .populate({
                        path: 'audience',
                        select: 'name photo',
                    })
                    .populate({
                        path: 'brodcasters',
                        select: 'name photo',
                    })

                const token = generateRTC(socket.user.roomName, false)

                socket.user.roomName = room.name
                socket.join(room.name)
                io.to(socket.id).emit(
                    'joinRoomSuccess',
                    socket.user,
                    room,
                    token
                )

                socket.to(room.name).emit('userJoined', socket.user)
            }
        })

        socket.on('adminReJoinRoom', async () => {
            const adminFoundInRoom = await Room.findOne({
                admin: socket.user.id,
            })
            if (adminFoundInRoom && adminFoundInRoom.isActivated === false) {
                socket.join(adminFoundInRoom.name)
                socket.user.roomName = adminFoundInRoom.name
                const room = await Room.findOneAndUpdate(
                    { name: adminFoundInRoom.name },
                    {
                        isActivated: true,
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )

                io.to(socket.id).emit(
                    'adminReJoinedRoomSuccess',
                    socket.user,
                    room
                )
            } else {
                io.to(socket.id).emit('errorMessage', "can't join room")
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
            if (
                !user ||
                !user.id ||
                !user.socketId ||
                !user.roomName ||
                !user.photo
            ) {
                io.to(socket.id).emit('errorMessage', 'user info not complete')
                return
            }
            // check if the emitter is the admin
            const { admin, audience, _id } = await Room.findOne({
                name: socket.user.roomName,
            })
                .select('admin audience')
                .lean()

            if (!admin) {
                io.to(socket.id).emit('errorMessage', 'room not found')
                return
            }

            if (!(admin.toString() === socket.user.id.toString())) {
                io.to(socket.id).emit(
                    'errorMessage',
                    'you are not the room admin'
                )
                return
            }

            const foundInAudience = audience.some(
                (aud) => aud.toString() === user.id.toString()
            )
            if (!foundInAudience) {
                io.to(socket.id).emit(
                    'errorMessage',
                    'user not in audience list'
                )
                return
            }

            await Room.updateOne(
                { _id },
                {
                    $pull: {
                        audience: user.id,
                    },

                    $push: {
                        brodcasters: user.id,
                    },
                }
            )

            const token = generateRTC(user.roomName, true)

            io.to(user.roomName).emit('userChangedToBrodcaster', user)
            io.to(user.socketId).emit('brodcasterToken', token)
        })

        socket.on('weHaveToGoBack', async () => {
            if (socket.user.roomName && socket.user.socketId) {
                const room = await Room.findOne({
                    name: socket.user.roomName,
                    brodcasters: socket.user.id,
                })

                if (!room) {
                    io.to(socket.id).emit('errorMessage', 'room not found')
                    return
                }

                await Room.updateOne(
                    { name: socket.user.roomName },
                    {
                        $pull: {
                            brodcasters: socket.user.id,
                        },

                        $push: {
                            audience: socket.user.id,
                        },
                    }
                )

                const token = generateRTC(socket.user.roomName, false)

                io.to(socket.user.roomName).emit(
                    'userChangedToAudience',
                    socket.user
                )
                io.to(socket.user.socketId).emit('audienceToken', token)
            }
        })

        socket.on('takeAwayPermsFrom', async (user) => {
            // check if there is a user object
            if (
                !user ||
                !user.id ||
                !user.socketId ||
                !user.roomName ||
                !user.photo
            ) {
                io.to(socket.id).emit('errorMessage', 'user info not complete')
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

            if (!(admin.toString() === socket.user.id.toString())) {
                io.to(socket.id).emit(
                    'errorMessage',
                    'you are not the room admin'
                )
                return
            }

            const foundInBrodcasters = brodcasters.some(
                (brod) => brod.toString() === user.id.toString()
            )
            if (!foundInBrodcasters) {
                io.to(socket.id).emit(
                    'errorMessage',
                    'user is not in brodcasters list'
                )
                return
            }

            await Room.updateOne(
                { _id },
                {
                    $pull: {
                        brodcasters: user.id,
                    },

                    $push: {
                        audience: user.id,
                    },
                }
            )

            const token = generateRTC(user.roomName, false)

            io.to(user.roomName).emit('userChangedToAudience', user)
            io.to(user.socketId).emit('audienceToken', token)
        })

        socket.on('disconnecting', async () => {
            const existingRoom = await Room.findOne({
                name: socket.user.roomName,
            })
            console.log('user', socket.user)
            console.log('room', existingRoom)
            if (existingRoom) {
                if (
                    socket.user.id.toString() === existingRoom.admin.toString()
                ) {
                    await Room.updateOne(
                        { _id: existingRoom._id },
                        {
                            isActivated: false,
                        }
                    )
                    setTimeout(async () => {
                        const roomStatus = await Room.findById(
                            existingRoom._id
                        ).select('isActivated')
                        if (!roomStatus.isActivated) {
                            io.to(existingRoom.name).emit('adminLeft')
                            clearTimeout(socket.timerId)
                            io.in(socket.user.roomName).disconnectSockets(true)
                            try {
                                const foundRoom = await Room.findOneAndDelete({
                                    name: socket.user.roomName,
                                })

                                console.log('foundRoom', foundRoom)
                            } catch (err) {
                                console.log(err)
                            }
                        }
                    }, 30000)
                } else {
                    io.to(existingRoom.name).emit('userLeft', socket.user)
                    await Room.updateOne(
                        { _id: existingRoom._id },
                        {
                            $pull: {
                                audience: socket.user.id,
                                brodcasters: socket.user.id,
                            },
                        }
                    )
                }
            }
            console.log('userLeft: ', socket.user.id)
        })
    }
}
