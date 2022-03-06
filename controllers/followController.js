const Follow = require('../models/followModel')
const User = require('../models/userModel')
const AppError = require('../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const { StatusCodes } = require('http-status-codes')

exports.followUser = catchAsync(async (req, res, next) => {
    const followExists = await Follow.findOne({
        follower: req.user.id,
        following: req.params.userId,
    })

    if (followExists) {
        return next(
            new AppError(
                'you already follow this user',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const userExists = await User.findById(req.params.userId)

    if (!userExists) {
        return next(
            new AppError(
                'there is no user with that ID',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const follow = await Follow.create({
        follower: req.user.id,
        following: req.params.userId,
    })

    if (follow) {
        await User.updateOne(
            { _id: req.params.userId },
            { $inc: { followers: 1 } }
        )

        await User.updateOne({ _id: req.user.id }, { $inc: { following: 1 } })
    }

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'user followed!',
    })
})
