const Podcast = require('../models/podcastModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const { uploader, createImageUpload } = require('../utils/cloudinary')
const ApiFeatures = require('../utils/apiFeatures')

const getAllPodcasts = catchAsync(async (req, res, next) => {
    const data = new ApiFeatures(
        Podcast.find({}).populate('createdBy', 'name photo country language'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    res.status(StatusCodes.OK).json({ status: 'success', data: query })
})

const getMyPodcasts = catchAsync(async (req, res, next) => {
    const data = new ApiFeatures(
        Podcast.find({ createdBy: req.user.id }).populate(
            'createdBy',
            'name photo country language'
        ),
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
        const data = await Podcast.findOne({
            _id: podcastId,
        }).populate('createdBy', 'name photo country language')
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
    const { audio } = req.body
    if (!audio) {
        next(
            new AppError(
                'Please, Provide the Audio Object',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    if (!audio.is_audio) {
        next(
            new AppError(
                'Not audio , make sure that you uploaded an audio',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    req.body.audio = undefined

    let data = await Podcast.create({
        ...req.body,
        audio: {
            url: audio.secure_url,
            duration: audio.duration,
            publicID: audio.public_id,
        },
    })


    data = await data
        .populate('createdBy', 'name photo country language')
        .execPopulate()

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
        ).populate('createdBy', 'name photo country language')
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
        console.log(data)
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
    const data = await Podcast.find({ $text: { $search: s } }, '-score', {
        score: { $meta: 'textScore' },
    })
        .populate('createdBy', 'name photo country language')
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
    res.status(StatusCodes.OK).json({ status: 'success', data })
})

const generateSignature = catchAsync(async (req, res, next) => {
    const { timestamp, signature } = await createImageUpload()
    res.status(StatusCodes.OK).json({
        timestamp,
        signature,
        cloudName: process.env.CLOUD_NAME,
        apiKey: process.env.CLOUD_API_KEY,
    })
})

module.exports = {
    getAllPodcasts,
    getPodcast,
    createPodcast,
    updatePodcast,
    deletePodcast,
    getMyPodcasts,
    searchPodcast,
    generateSignature,
}
