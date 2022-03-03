const Podcast = require('../models/podcastModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const { uploader } = require('../utils/cloudinary')
const { getAudioDuration } = require('../utils/getAudioDuration')
const removeFile = require('../utils/removeFile')
const ApiFeatures = require('../utils/apiFeatures')

const getAllPodcasts = catchAsync(async (req, res, next) => {
    const { status } = req.query
    if (status) {
        req.query.status = undefined
    }
    const data = new ApiFeatures(Podcast.find({ status: 'public' }), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    res.status(StatusCodes.OK).json({ status: 'success', data: query })
})

const getMyPodcasts = catchAsync(async (req, res, next) => {
    const data = new ApiFeatures(
        Podcast.find({ createdBy: req.user.id }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    res.status(StatusCodes.OK).json({ status: 'success', data: query })
})

const getPodcast = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params
        const { id: userId } = req.user
        const data = await Podcast.findOne({
            _id: podcastId,
            createdBy: userId,
        })
        if (!data) {
            next(new AppError('Not found', StatusCodes.NOT_FOUND))
        }
        res.status(StatusCodes.OK).json({ status: 'success', data })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})

const createPodcast = catchAsync(async (req, res, next) => {
    req.body.createdBy = req.user.id
    if (!req.file) {
        next(
            new AppError('Please, provide the podcast', StatusCodes.BAD_REQUEST)
        )
    }
    const duration = await getAudioDuration(req.file.path)
    const file = await uploader.upload(req.file.path, {
        folder: 'podcasts',
        resource_type: 'video',
    })
    console.log('file uploaded')
    const data = await Podcast.create({
        ...req.body,
        audio: { url: file.secure_url, duration, publicID: file.public_id },
    })
    removeFile(req.file.path)
    res.status(StatusCodes.CREATED).json({ status: 'success', data })
})

const updatePodcast = catchAsync(async (req, res, next) => {
    try {
        const { id: PodcastId } = req.params
        const { id: userId } = req.user
        const data = await Podcast.findOneAndUpdate(
            { _id: PodcastId, createdBy: userId },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        )
        if (!data) {
            next(new AppError('Not found', StatusCodes.NOT_FOUND))
        }
        res.status(StatusCodes.OK).json({ status: 'success', data })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})

const deletePodcast = catchAsync(async (req, res, next) => {
    try {
        const { id: PodcastId } = req.params
        const { id: userId } = req.user
        const data = await Podcast.findOneAndRemove({
            _id: PodcastId,
            createdBy: userId,
        })
        if (!data) {
            next(new AppError('Not found', StatusCodes.NOT_FOUND))
        }

        await uploader.destroy(data.audio.publicID, {
            resource_type: 'video',
        })

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Podcast is deleted',
        })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})

const searchPodcast = catchAsync(async (req, res, next) => {
    const { s } = req.query
    if (!s) {
        next(
            new AppError('Please, check search param', StatusCodes.BAD_REQUEST)
        )
    }
    const data = await Podcast.find({
        $text: {
            $search: s,
        },
        status: 'public',
    }).limit(10)

    res.status(StatusCodes.OK).json({ status: 'success', data })
})

module.exports = {
    getAllPodcasts,
    getPodcast,
    createPodcast,
    updatePodcast,
    deletePodcast,
    getMyPodcasts,
    searchPodcast,
}
