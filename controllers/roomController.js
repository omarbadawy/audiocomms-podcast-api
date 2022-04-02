const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('../utils/catchAsync')
const generateRTC = require('../utils/generateRTC')
const Room = require('../models/roomModel')
const factory = require('./handlerFactory')
const { StatusCodes } = require('http-status-codes')
const Category = require('../models/categoryModel')

exports.getAllRooms = catchAsync(async (req, res, next) => {
    if (req.query.status) {
        req.query.status = 'public'
    }

    req.query.isActivated = true

    const featuresBeforePagination = new APIFeatures(
        Room.find({ status: 'public' }),
        req.query
    ).filter()

    const features = new APIFeatures(Room.find({ status: 'public' }), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()

    // const docs = await features.query.explain()
    let rooms = await features.query
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

    const docsCount = await Room.countDocuments(featuresBeforePagination.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        docsCount,
        results: rooms.length,
        data: rooms,
    })
})

exports.generateAgoraToken = catchAsync(async (req, res, next) => {
    const { channel } = req.query
    // let uid = req.body.uid;

    if (!channel) {
        return res.status(400).json({ msg: 'Please, provide channel ' })
    }

    const token = generateRTC(channel, false)

    if (!token) {
        return next(new AppError('Token generation Error!', 400))
    }

    res.status(200).json({
        status: 'success',
        token,
    })
})

exports.searchRoom = catchAsync(async (req, res, next) => {
    const { s } = req.query
    if (!s) {
        return next(
            new AppError('Please, check search param', StatusCodes.BAD_REQUEST)
        )
    }
    const data = await Room.find(
        { status: 'public', isActivated: false, $text: { $search: s } },
        '-score',
        {
            score: { $meta: 'textScore' },
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
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
    res.status(StatusCodes.OK).json({ status: 'success', data })
})

exports.getRoom = factory.getOne(Room)
exports.deleteRoom = factory.deleteOne(Room)
