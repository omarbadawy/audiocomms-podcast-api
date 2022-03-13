const Likes = require('../models/likesModel')
const Podcast = require('../models/podcastModel')
const catchAsync = require('../utils/catchAsync')
const ApiFeatures = require('../utils/apiFeatures')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')

const getAllLikes = catchAsync(async (req, res, next) => {
    const allData = new ApiFeatures(Likes.find({}), req.query).filter()

    const data = new ApiFeatures(
        Likes.find({}).populate('podcast').populate('user'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    const docsCount = await Likes.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: query,
        docsCount,
    })
})

const getMyLikes = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const allData = new ApiFeatures(
        Likes.find({ user: userId }),
        req.query
    ).filter()

    const data = new ApiFeatures(
        Likes.find({ user: userId }).populate('podcast'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    const docsCount = await Likes.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: query,
        docsCount,
    })
})
const getPodcastLikes = catchAsync(async (req, res, next) => {
    try {
        // const { id: userId } = req.user
        const { id: podcastId } = req.params

        if (!podcastId) {
            return next(
                new AppError(
                    'Please, check the podcast id param',
                    StatusCodes.BAD_REQUEST
                )
            )
        }

        const allData = new ApiFeatures(
            Likes.find({ podcast: podcastId }).populate(
                'user',
                'name photo country language'
            ),
            req.query
        ).filter()

        const data = new ApiFeatures(
            Likes.find({ podcast: podcastId }).populate(
                'user',
                'name photo country language'
            ),
            req.query
        )
            .filter()
            .sort()
            .limitFields()
            .paginate()
        const query = await data.query

        const docsCount = await Likes.countDocuments(allData.query)

        await Podcast.updateOne({ _id: podcastId }, { likes: docsCount })

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: query,
            docsCount,
        })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})
const addLike = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params
        const { id: userId } = req.user

        if (!podcastId) {
            return next(
                new AppError(
                    'Please, check the podcast id param',
                    StatusCodes.BAD_REQUEST
                )
            )
        }

        const oldData = await Likes.findOne({
            podcast: podcastId,
            user: userId,
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
            podcast: podcastId,
            user: userId,
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
            podcast: podcastId,
            user: userId,
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

const removeLikeByPodcastId = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params

        const data = await Likes.findOneAndRemove({
            podcast: podcastId,
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
    getAllLikes,
    getMyLikes,
    addLike,
    removeLike,
    getPodcastLikes,
    removeLikeByPodcastId,
}
