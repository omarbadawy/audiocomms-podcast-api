const Likes = require('../models/likesModel')
const Podcast = require('../models/podcastModel')
const catchAsync = require('../utils/catchAsync')
const ApiFeatures = require('../utils/apiFeatures')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')

const getMyLikes = catchAsync(async (req, res, next) => {
    const data = new ApiFeatures(
        Likes.find({ likeBy: req.user.id }).populate('likeTo'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    res.status(StatusCodes.OK).json({ status: 'success', data: query })
})
const addLike = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params
        const { id: userId } = req.user

        const oldData = await Likes.findOne({
            likeTo: podcastId,
            likeBy: userId,
        })

        if (oldData) {
            return next(
                new AppError(
                    'you already liked this podcast',
                    StatusCodes.BAD_REQUEST
                )
            )
        }

        const data = await Likes.create({
            likeTo: podcastId,
            likeBy: userId,
        })

        if (data) {
            await Podcast.updateOne({ _id: podcastId }, { $inc: { likes: 1 } })
        }

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Like is added',
        })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})
const removeLike = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params
        const { id: userId } = req.user

        const data = await Likes.findOneAndRemove({
            likeTo: podcastId,
            likeBy: userId,
        })

        if (!data) {
            return next(new AppError('Not found', StatusCodes.NOT_FOUND))
        }
        await Podcast.updateOne({ _id: podcastId }, { $inc: { likes: -1 } })

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Like is removed',
        })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})

module.exports = {
    getMyLikes,
    addLike,
    removeLike,
}
