const User = require('../models/userModel')
const Room = require('../models/roomModel')

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
}

exports.socketIOHandler = function (io) {
    return (socket) => {
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

                console.log('socket user id', socket.user.id)
                if (
                    existingRoom.admin.toString() === socket.user.id.toString()
                ) {
                    if (existingRoom.isActivated) {
                        io.to(socket.id).emit('adminAlreadyInRoom')
                        return
                    }

                    socket.join(existingRoom.name)
                    io.to(socket.id).emit('joinRoomSuccess', socket.user)
                    await Room.updateOne(
                        { _id: existingRoom._id },
                        { isActivated: true }
                    )
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
                io.to(socket.id).emit('joinRoomSuccess', socket.user)

                socket.to(room.name).emit('userJoined', socket.user)
            }
        })

        socket.on('askForPerms', () => {
            if (socket.user.roomName) {
                socket
                    .to(socket.user.roomName)
                    .emit('userAskedForPerms', socket.user)
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
                return
            }
            // check if the emitter is the admin
            const { admin, audience, _id } = await Room.findOne({
                name: socket.user.roomName,
            })
                .select('admin audience')
                .lean()

            if (!admin) {
                return
            }

            if (!(admin.toString() === socket.user.id.toString())) {
                return
            }

            const foundInAudience = audience.some(
                (aud) => aud.toString() === user.id.toString()
            )
            if (!foundInAudience) {
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

                if (!room) return

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
                return
            }

            // check if the emitter is the admin
            const { admin, brodcasters, _id } = await Room.findOne({
                name: socket.user.roomName,
            })
                .select('admin brodcasters')
                .lean()

            if (!admin) {
                return
            }

            if (!(admin.toString() === socket.user.id.toString())) {
                return
            }

            const foundInBrodcasters = brodcasters.some(
                (brod) => brod.toString() === user.id.toString()
            )
            if (!foundInBrodcasters) {
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
            if (existingRoom) {
                if (
                    socket.user.id.toString() === existingRoom.admin.toString()
                ) {
                    io.to(existingRoom.name).emit('adminLeft')
                    io.in(socket.user.roomName).disconnectSockets(true)
                    try {
                        await Room.findOneAndDelete({
                            name: socket.user.roomName,
                        })
                    } catch (err) {
                        console.log(err)
                    }
                }
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
            console.log('userLeft: ', socket.user.id)
        })
    }
}
