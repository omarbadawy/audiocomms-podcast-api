const Podcast = require('../models/podcastModel')
const Likes = require('../models/likesModel')
const Follow = require('../models/followModel')
const Category = require('../models/categoryModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const { uploader, createImageUpload } = require('../utils/cloudinary')
const ApiFeatures = require('../utils/apiFeatures')

const getAllPodcasts = catchAsync(async (req, res, next) => {
    const allData = new ApiFeatures(
        Podcast.find({}).populate('podcastId'),
        req.query
    ).filter()

    const data = new ApiFeatures(
        Podcast.find({}).populate('createdBy', 'name photo country language'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    const podcastsData = JSON.parse(JSON.stringify(query))
    const podcastsId = []

    podcastsData.forEach((podcast) => podcastsId.push(podcast._id))

    let podcastsLike = await Likes.find({
        podcastId: {
            $in: podcastsId,
        },
    })

    podcastsLike = JSON.parse(JSON.stringify(podcastsLike))

    for (let podcast of podcastsData) {
        for (let item of podcastsLike) {
            if (podcast._id === item.podcastId) {
                podcast.isLiked = true
                break
            }
            podcast.isLiked = false
        }
    }

    const docsCount = await Podcast.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: podcastsData,
        docsCount,
    })
})

const getMyPodcasts = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const allData = new ApiFeatures(
        Podcast.find({ createdBy: userId }).populate('podcastId'),
        req.query
    ).filter()

    const data = new ApiFeatures(
        Podcast.find({ createdBy: userId }).populate(
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

    const podcastsData = JSON.parse(JSON.stringify(query))
    const podcastsId = []

    podcastsData.forEach((podcast) => podcastsId.push(podcast._id))

    let podcastsLike = await Likes.find({
        podcastId: {
            $in: podcastsId,
        },
    })

    podcastsLike = JSON.parse(JSON.stringify(podcastsLike))

    for (let podcast of podcastsData) {
        for (let item of podcastsLike) {
            if (podcast._id === item.podcastId) {
                podcast.isLiked = true
                break
            }
            podcast.isLiked = false
        }
    }

    const docsCount = await Podcast.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: podcastsData,
        docsCount,
    })
})

const getPodcast = catchAsync(async (req, res, next) => {
    try {
        const { id: podcastId } = req.params
        const { id: userId } = req.user

        let data = await Podcast.findOne({
            _id: podcastId,
        }).populate('createdBy', 'name photo country language')

        if (!data) {
            return next(new AppError('Not found', StatusCodes.NOT_FOUND))
        }

        const userLike = await Likes.findOne({
            likeTo: podcastId,
            likeBy: userId,
        })

        data = JSON.parse(JSON.stringify(data))
        data.isLiked = userLike ? true : false
        res.status(StatusCodes.OK).json({
            status: 'success',
            data,
        })
    } catch (error) {
        next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    }
})

const createPodcast = catchAsync(async (req, res, next) => {
    req.body.createdBy = req.user.id
    const { audio, category } = req.body
    if (!audio) {
        return next(
            new AppError(
                'Please, Provide the Audio Object',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    const audioTypes = ['wav', 'mp3', 'mp4', 'wma', 'flac', 'm4a']
    const isAudio = (audio) => {
        return audioTypes.some((suffix) => audio.secure_url.endsWith(suffix))
    }
    if (!isAudio(audio)) {
        return next(
            new AppError(
                'Not audio , make sure that you uploaded an audio',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    req.body.audio = undefined

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
        const { category, name } = req.body

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
        const data = await Podcast.findOneAndUpdate(
            { _id: PodcastId, createdBy: userId },
            { category, name },
            {
                new: true,
                runValidators: true,
            }
        ).populate('createdBy', 'name photo country language')
        if (!data) {
            return next(new AppError('Not found', StatusCodes.NOT_FOUND))
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
            return next(new AppError('Not found', StatusCodes.NOT_FOUND))
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

const getMyFollowingPodcasts = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user

    let followingData = await Follow.find({ follower: userId }).select(
        'following'
    )

    followingData = JSON.parse(JSON.stringify(followingData))
    const followingIds = []

    followingData.forEach((item) => followingIds.push(item.following))

    const allPodcastsData = new ApiFeatures(
        Podcast.find({
            createdBy: {
                $in: followingIds,
            },
        }).populate('createdBy', 'name photo country language'),
        req.query
    ).filter()

    let podcastsData = new ApiFeatures(
        Podcast.find({
            createdBy: {
                $in: followingIds,
            },
        }).populate('createdBy', 'name photo country language'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    podcastsData = JSON.parse(JSON.stringify(await podcastsData.query))

    const docsCount = await Podcast.countDocuments(allPodcastsData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: podcastsData,
        docsCount,
    })
})

const searchPodcast = catchAsync(async (req, res, next) => {
    const { s } = req.query
    if (!s) {
        return next(
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
    getMyFollowingPodcasts,
    searchPodcast,
    generateSignature,
}
