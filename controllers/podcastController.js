const Podcast = require('../models/podcastModel')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const { uploader } = require('../utils/cloudinary')
const { getAudioDuration } = require('../utils/getAudioDuration')
const removeFile = require('../utils/removeFile')
const ApiFeatures = require('../utils/apiFeatures')

const getAllPodcasts = async (req, res) => {
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

    res.status(StatusCodes.OK).json({ data: query })
}

const getMyPodcasts = async (req, res) => {
    const data = new ApiFeatures(
        Podcast.find({ createdBy: req.user.id }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()
    const query = await data.query

    res.status(StatusCodes.OK).json({ data: query })
}

const getPodcast = async (req, res) => {
    const { id: podcastId } = req.params
    const { id: userId } = req.user
    const data = await Podcast.findOne({
        _id: podcastId,
        createdBy: userId,
    })
    if (!data) {
        throw new AppError('Not found', StatusCodes.NOT_FOUND)
    }
    res.status(StatusCodes.OK).json({ data })
}

const createPodcast = async (req, res) => {
    req.body.createdBy = req.user.id
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
    res.status(StatusCodes.CREATED).json({ data })
}

const updatePodcast = async (req, res) => {
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
        throw new AppError('Not found', StatusCodes.NOT_FOUND)
    }
    res.status(StatusCodes.OK).json({ data })
}

const deletePodcast = async (req, res) => {
    const { id: PodcastId } = req.params
    const { id: userId } = req.user
    const data = await Podcast.findOneAndRemove({
        _id: PodcastId,
        createdBy: userId,
    })
    if (!data) {
        throw new AppError('Not found', StatusCodes.NOT_FOUND)
    }

    await uploader.destroy(data.audio.publicID, {
        resource_type: 'video',
    })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Podcast is deleted',
    })
}

const searchPodcast = async (req, res) => {
    const { s } = req.query
    if (!s) {
        throw new AppError(
            'Please, check search param',
            StatusCodes.BAD_REQUEST
        )
    }
    const data = await Podcast.find({
        $text: {
            $search: s,
        },
        status: 'public',
    }).limit(10)

    res.status(StatusCodes.OK).json({ data })
}

module.exports = {
    getAllPodcasts,
    getPodcast,
    createPodcast,
    updatePodcast,
    deletePodcast,
    getMyPodcasts,
    searchPodcast,
}
