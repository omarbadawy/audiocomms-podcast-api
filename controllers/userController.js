const AppError = require('../utils/appError')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const { uploader } = require('../utils/cloudinary')
const { StatusCodes } = require('http-status-codes')

const { Readable } = require('stream')
const sharp = require('sharp')

const filterObj = (obj, ...allowedFeilds) => {
    const newObj = {}
    Object.keys(obj).forEach((el) => {
        if (allowedFeilds.includes(el)) {
            newObj[el] = obj[el]
        }
    })
    return newObj
}

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id
    next()
}

exports.getAllUsers = factory.getAll(User)

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword',
                400
            )
        )
    }

    if (req.file) {
        const bufferToStream = (buffer) => {
            const readable = new Readable({
                read() {
                    this.push(buffer)
                    this.push(null)
                },
            })
            return readable
        }

        const data = await sharp(req.file.buffer)
            .webp({ quality: 20 })
            .toBuffer()
        const stream = uploader.upload_stream(
            { folder: 'userPhotos' },
            (error, result) => {
                if (error)
                    return next(
                        new AppError(error.message, StatusCodes.BAD_REQUEST)
                    )
                req.body.photo = result.secure_url
            }
        )
        bufferToStream(data).pipe(stream)
    }

    // filtered out unwanted feild names

    const filteredBody = filterObj(
        req.body,
        'name',
        'email',
        'language',
        'country',
        'userType',
        'photo'
    )

    //Update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    )

    // send the response
    res.status(200).json({
        status: 'success',
        user: updatedUser,
    })
})

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {
        active: false,
    })

    res.status(204).json({
        status: 'success',
        data: null,
    })
})

exports.getAllFullUsers = factory.getAll(User, true)

exports.getFullUser = factory.getOne(User, true)

// Don't update passwords with this
exports.updateUser = factory.updateOne(User)

exports.deleteUser = factory.deleteOne(User)
