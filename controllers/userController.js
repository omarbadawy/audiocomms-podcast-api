const AppError = require('../utils/appError')
const User = require('../models/userModel')
const Follow = require('../models/followModel')
const Like = require('../models/likesModel')
const Podcast = require('../models/podcastModel')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('../utils/catchAsync')
const factory = require('./handlerFactory')
const { uploader } = require('../utils/cloudinary')
const { StatusCodes } = require('http-status-codes')
const { promisify } = require('util')

const { Readable } = require('stream')
const sharp = require('sharp')

const stringToHashCode = require('../utils/stringToHashCode')

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

exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select('-active -role')
        .lean()

    if (!user) {
        return next(
            new AppError('There is no user with that ID', StatusCodes.NOT_FOUND)
        )
    }

    const followedByMe = await Follow.findOne({
        follower: req.user.id,
        following: req.params.id,
    }).lean()

    user.isFollowed = followedByMe ? true : false

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: user,
    })
})

exports.getAllUsers = catchAsync(async (req, res, next) => {
    const featuresBeforePagination = new APIFeatures(
        User.find(),
        req.query
    ).filter()

    const features = new APIFeatures(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()

    // const docs = await features.query.explain()
    let users = await features.query
        .select('-role -passwordResetToken -passwordResetExpires -active')
        .lean()

    const usersIds = []

    users.forEach((user) => usersIds.push(user._id))

    let usersFollowedByMe = await Follow.find(
        {
            follower: req.user.id,
            following: { $in: usersIds },
        },
        { following: 1, _id: 0 }
    ).lean()

    users.forEach((user) => {
        user.isFollowed = usersFollowedByMe.some(
            (userFollowed) =>
                userFollowed.following.toString() === user._id.toString()
        )
    })

    const docsCount = await User.countDocuments(featuresBeforePagination.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: users.length,
        docsCount,
        data: users,
    })
})

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

    // filtered out unwanted feild names
    const filteredBody = filterObj(
        req.body,
        'name',
        'email',
        'language',
        'country',
        'bio'
    )

    if (filteredBody.name) {
        filteredBody.uid = stringToHashCode(String(filteredBody.name))
        // console.log(filteredBody.name, filteredBody.uid)
    }
    //Update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    ).select('+email -active')

    // send the response
    res.status(200).json({
        status: 'success',
        user: updatedUser,
    })
})

exports.updateMyPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please, provide the photo', 400))
    }

    const uploadImageToCloudinary = (req) => {
        return new Promise(async (resolve, reject) => {
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
                    if (error) reject(error)
                    else {
                        resolve(result)
                    }
                }
            )
            bufferToStream(data).pipe(stream)
        })
    }

    const photoData = await uploadImageToCloudinary(req)
    req.body.photo = photoData.secure_url
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            photo: req.body.photo,
        },
        {
            new: true,
            runValidators: true,
        }
    ).select('+email -active')

    return res.status(200).json({
        status: 'success',
        user: updatedUser,
    })
})

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {
        active: false,
    })

    await Follow.deleteMany({ follower: req.user.id })
    await Follow.deleteMany({ following: req.user.id })
    await Like.deleteMany({ user: req.user.id })
    await Podcast.deleteMany({ createdBy: req.user.id })

    res.status(204).json({
        status: 'success',
        data: null,
    })
})

exports.getUnfollowedUsers = catchAsync(async (req, res, next) => {
    const followedUsers = await Follow.find(
        { follower: req.user.id },
        { following: 1, _id: 0 }
    )

    const usersIds = [req.user.id]

    if (followedUsers) {
        followedUsers.forEach((user) => usersIds.push(user.following))
    }

    const featuresBeforePagination = new APIFeatures(
        User.find({ _id: { $nin: usersIds } }),
        req.query
    ).filter()

    const features = new APIFeatures(
        User.find({ _id: { $nin: usersIds } }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    // const docs = await features.query.explain()
    let users = await features.query
        .select('-role -passwordResetToken -passwordResetExpires -active')
        .lean()

    const docsCount = await User.countDocuments(featuresBeforePagination.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        docsCount,
        results: users.length,
        data: users,
    })
})

exports.searchUser = catchAsync(async (req, res, next) => {
    const { s } = req.query
    if (!s) {
        return next(
            new AppError('Please, check search param', StatusCodes.BAD_REQUEST)
        )
    }
    const users = await User.find(
        { $text: { $search: s }, active: true },
        '-score',
        {
            score: { $meta: 'textScore' },
        }
    )
        .select('-active -role -passwordChangedAt')
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
        .lean()

    const usersIds = []

    users.forEach((user) => usersIds.push(user._id))

    let usersFollowedByMe = await Follow.find(
        {
            follower: req.user.id,
            following: { $in: usersIds },
        },
        { following: 1, _id: 0 }
    ).lean()

    users.forEach((user) => {
        user.isFollowed = usersFollowedByMe.some(
            (userFollowed) =>
                userFollowed.following.toString() === user._id.toString()
        )
    })

    res.status(StatusCodes.OK).json({ status: 'success', data: users })
})

exports.getAllFullUsers = factory.getAll(User, true)

exports.getFullUser = factory.getOne(User, true)

// Don't update passwords with this
exports.updateUser = factory.updateOne(User)

exports.deleteUser = catchAsync(async (req, res, next) => {
    const doc = await User.findByIdAndDelete(req.params.id)

    if (!doc) {
        return next(new AppError('No document Found With That ID', 404))
    }

    await Follow.deleteMany({ follower: req.params.id })
    await Follow.deleteMany({ following: req.params.id })
    await Like.deleteMany({ user: req.params.id })
    await Podcast.deleteMany({ createdBy: req.params.id })

    res.status(204).json({
        status: 'success',
        data: null,
    })
})
