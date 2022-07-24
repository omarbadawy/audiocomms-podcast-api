const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('../utils/catchAsync')
const RoomChat = require('../models/roomChatModel')
const factory = require('./handlerFactory')
const { StatusCodes } = require('http-status-codes')

const getAllRoomChat = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const { id: roomId } = req.params
    if (req.query.status) {
        delete req.query.status
    }
    const allChat = new APIFeatures(
        RoomChat.find({
            $or: [
                { status: 'public', room: roomId },
                { status: 'private', user: userId, room: roomId },
                { status: 'private', to: userId, room: roomId },
            ],
        }),
        req.query
    ).filter()

    const chat = new APIFeatures(
        RoomChat.find({
            $or: [
                { status: 'public', room: roomId },
                { status: 'private', user: userId, room: roomId },
                { status: 'private', to: userId, room: roomId },
            ],
        }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    let chatMessages = await chat.query
        .populate({
            path: 'user',
            select: 'name photo uid',
        })
        .populate({
            path: 'to',
            select: 'name photo uid',
        })
        .populate({
            path: 'room',
            select: 'name category',
        })
        .lean()

    chatMessages = chatMessages.map((item) => {
        if (
            item.status === 'public' ||
            item.to._id.toString() === item.user._id.toString()
        ) {
            item.to = undefined
        }
        return item
    })

    const docsCount = await RoomChat.countDocuments(allChat.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        docsCount,
        results: chatMessages.length,
        data: chatMessages,
    })
})

const searchRoomChat = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const { s } = req.query
    const { id: roomId } = req.params
    console.log(roomId, s)
    if (!s) {
        return next(
            new AppError('Please, check search param', StatusCodes.BAD_REQUEST)
        )
    }
    let data = await RoomChat.find(
        {
            $or: [
                { status: 'public', room: roomId },
                { status: 'private', user: userId, room: roomId },
                { status: 'private', to: userId, room: roomId },
            ],
            $text: { $search: s },
        },
        '-score',
        {
            score: { $meta: 'textScore' },
        }
    )
        .populate({
            path: 'user',
            select: 'name photo uid',
        })
        .populate({
            path: 'to',
            select: 'name photo uid',
        })
        .populate({
            path: 'room',
            select: 'name category',
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
        .lean()
    data = data.map((item) => {
        if (
            item.status === 'public' ||
            item.to._id.toString() === item.user._id.toString()
        ) {
            item.to = undefined
        }
        return item
    })
    res.status(StatusCodes.OK).json({
        status: 'success',
        data,
        results: data.length,
    })
})

const getMessage = catchAsync(async (req, res, next) => {
    const { id: messageId } = req.params

    if (!messageId) {
        return next(
            new AppError('Please, check room id param', StatusCodes.BAD_REQUEST)
        )
    }

    let data = await RoomChat.findOne({
        _id: messageId,
    })
        .populate({
            path: 'user',
            select: 'name photo uid',
        })
        .populate({
            path: 'to',
            select: 'name photo uid',
        })
        .populate({
            path: 'room',
            select: 'name category',
        })
        .lean()
    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    if (
        data.status === 'public' ||
        item.to._id.toString() === item.user._id.toString()
    )
        data.to = undefined
    res.status(StatusCodes.OK).json({
        status: 'success',
        data,
    })
})

const deleteMessage = factory.deleteOne(RoomChat)

module.exports = {
    getAllRoomChat,
    getMessage,
    deleteMessage,
    searchRoomChat,
}
