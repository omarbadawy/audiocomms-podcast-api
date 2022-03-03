const AppError = require('../utils/appError')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const { convertImg } = require('../utils/multer')
const { uploader } = require('../utils/cloudinary')
const removeFile = require('../utils/removeFile')

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

    // Convert photo to webp and return photo path
    const photoPath = await convertImg(req.file)
    // upload photo to cloudinary
    const photo = await uploader.upload(photoPath, {
        folder: 'userPhotos',
    })
    // add photo url to req.body
    req.body.photo = photo.secure_url
    // remove the image from server
    removeFile(photoPath)

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
