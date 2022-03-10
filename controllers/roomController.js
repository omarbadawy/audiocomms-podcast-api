const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('../utils/catchAsync')
const User = require('../models/userModel')
const Room = require('../models/roomModel')
const { StatusCodes } = require('http-status-codes')
const Category = require('../models/categoryModel')

exports.getAllRooms = catchAsync(async (req, res, next) => {
    if (req.query.status) {
        req.query.status = 'public'
    }
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

exports.createRoom = catchAsync(async (req, res, next) => {
    const { name, category, status } = req.body
    if (category) {
        const categoryData = await Category.findOne({ name: category })

        if (!categoryData) {
            return next(
                new AppError(
                    'There is no category with this name',
                    StatusCodes.BAD_REQUEST
                )
            )
        }
    }

    const room = await Room.create({
        name,
        admin: req.user.id,
        category,
        status,
    })

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        room,
    })
})
