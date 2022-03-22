const Podcast = require('../models/podcastModel')
const Likes = require('../models/likesModel')
const Follow = require('../models/followModel')
const Category = require('../models/categoryModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const { uploader, api, createImageUpload } = require('../utils/cloudinary')
const ApiFeatures = require('../utils/apiFeatures')

const getAllPodcasts = catchAsync(async (req, res, next) => {
    const allData = new ApiFeatures(Podcast.find({}), req.query).filter()

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
        user: req.user.id,
        podcast: {
            $in: podcastsId,
        },
    })

    podcastsLike = JSON.parse(JSON.stringify(podcastsLike))

    for (let podcast of podcastsData) {
        podcast.isLiked = false
        for (let item of podcastsLike) {
            if (podcast._id === item.podcast) {
                podcast.isLiked = true
                break
            }
        }
    }

    const docsCount = await Podcast.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: podcastsData.length,
        data: podcastsData,
        docsCount,
    })
})

const getMyPodcasts = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const allData = new ApiFeatures(
        Podcast.find({ createdBy: userId }),
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
        podcast: {
            $in: podcastsId,
        },
        user: userId,
    })

    podcastsLike = JSON.parse(JSON.stringify(podcastsLike))

    for (let podcast of podcastsData) {
        podcast.isLiked = false
        for (let item of podcastsLike) {
            if (podcast._id === item.podcast) {
                podcast.isLiked = true
                break
            }
        }
    }

    const docsCount = await Podcast.countDocuments(allData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: podcastsData.length,
        data: podcastsData,
        docsCount,
    })
})

const getPodcast = catchAsync(async (req, res, next) => {
    // try {
    const { id: podcastId } = req.params
    const { id: userId } = req.user

    if (!podcastId) {
        return next(
            new AppError(
                'Please, check podcast id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    let data = await Podcast.findOne({
        _id: podcastId,
    }).populate('createdBy', 'name photo country language')

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    const userLike = await Likes.findOne({
        podcast: podcastId,
        user: userId,
    })

    data = JSON.parse(JSON.stringify(data))
    data.isLiked = userLike ? true : false
    res.status(StatusCodes.OK).json({
        status: 'success',
        data,
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

const createPodcast = catchAsync(async (req, res, next) => {
    req.body.createdBy = req.user.id
    const { audio, category } = req.body
    if (!audio || !audio.public_id) {
        return next(
            new AppError(
                'Please, Provide the Audio Object with this info ( public_id )',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    // const audioTypes = ['wav', 'mp3', 'mp4', 'wma', 'flac', 'm4a']
    // const isAudio = (audio) => {
    //     return (
    //         audioTypes.some((suffix) => audio.format.endsWith(suffix)) &&
    //         audio.is_audio
    //     )
    // }
    const fileResource = await api.resource(
        audio.public_id,
        {
            resource_type: 'video',
            image_metadata: true,
        },
        (err) => {
            if (err) {
                return next(new AppError(err.message, 400))
            }
        }
    )

    if (!fileResource.video_metadata.is_audio) {
        return next(
            new AppError(
                'Not audio , make sure that you uploaded an audio',
                StatusCodes.BAD_REQUEST
            )
        )
    }

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

    req.body.audio = undefined

    let data = await Podcast.create({
        ...req.body,
        audio: {
            url: fileResource.secure_url,
            duration: fileResource.duration,
            publicID: fileResource.public_id,
        },
    })

    data = await data
        .populate('createdBy', 'name photo country language')
        .execPopulate()

    res.status(StatusCodes.CREATED).json({ status: 'success', data })
})

const updatePodcast = catchAsync(async (req, res, next) => {
    // try {
    const { id: podcastId } = req.params
    const { id: userId } = req.user
    const { category, name } = req.body

    if (!podcastId) {
        return next(
            new AppError(
                'Please, check podcast id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }

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
        { _id: podcastId, createdBy: userId },
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
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

const deletePodcast = catchAsync(async (req, res, next) => {
    // try {
    const { id: PodcastId } = req.params
    const { id: userId } = req.user
    if (!PodcastId) {
        return next(
            new AppError(
                'Please, check podcast id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    const data = await Podcast.findOneAndRemove({
        _id: PodcastId,
        createdBy: userId,
    })

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    await Likes.deleteMany({ podcast: PodcastId })

    await uploader.destroy(data.audio.publicID, {
        resource_type: 'video',
    })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Podcast is deleted',
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

const deletePodcastById = catchAsync(async (req, res, next) => {
    // try {
    const { id: podcastId } = req.params
    if (!podcastId) {
        return next(
            new AppError(
                'Please, check podcast id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    const data = await Podcast.findOneAndRemove({
        _id: podcastId,
    })

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    await Likes.deleteMany({ podcast: podcastId })

    await uploader.destroy(data.audio.publicID, {
        resource_type: 'video',
    })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Podcast is deleted',
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
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

    // add isLiked to podcasts
    const podcastsId = []

    podcastsData.forEach((podcast) => podcastsId.push(podcast._id))

    let podcastsLike = await Likes.find({
        podcast: {
            $in: podcastsId,
        },
        user: userId,
    }).select('podcast')

    podcastsLike = JSON.parse(JSON.stringify(podcastsLike))

    for (let podcast of podcastsData) {
        podcast.isLiked = false
        for (let item of podcastsLike) {
            if (podcast._id === item.podcast) {
                podcast.isLiked = true
                break
            }
        }
    }

    const docsCount = await Podcast.countDocuments(allPodcastsData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: podcastsData.length,
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
    res.status(StatusCodes.OK).json({
        status: 'success',
        results: data.length,
        data,
    })
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
    deletePodcastById,
    getMyPodcasts,
    getMyFollowingPodcasts,
    searchPodcast,
    generateSignature,
}
