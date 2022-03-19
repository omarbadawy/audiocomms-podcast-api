const Event = require('../models/eventModel')
const Follow = require('../models/followModel')
const catchAsync = require('../utils/catchAsync')
const ApiFeatures = require('../utils/apiFeatures')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')

const getAllEvents = catchAsync(async (req, res, next) => {
    const allEventsData = new ApiFeatures(
        Event.find({}).populate('createdBy', 'name photo country language'),
        req.query
    ).filter()

    let eventsData = new ApiFeatures(
        Event.find({}).populate('createdBy', 'name photo country language'),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    eventsData = JSON.parse(JSON.stringify(await eventsData.query))

    const docsCount = await Event.countDocuments(allEventsData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: eventsData,
        docsCount,
    })
})

const getAllFollowingEvents = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user

    let followingData = await Follow.find({ follower: userId }).select(
        'following'
    )

    followingData = JSON.parse(JSON.stringify(followingData))
    const followingIds = []

    followingData.forEach((item) => followingIds.push(item.following))

    const allEventsData = new ApiFeatures(
        Event.find({
            createdBy: {
                $in: followingIds,
            },
        }).populate('createdBy', 'name photo country language'),
        req.query
    ).filter()

    let eventsData = new ApiFeatures(
        Event.find({
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

    eventsData = JSON.parse(JSON.stringify(await eventsData.query))

    const docsCount = await Event.countDocuments(allEventsData.query)

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: eventsData,
        docsCount,
    })
})
const getEvent = catchAsync(async (req, res, next) => {
    // try {
    // const { id: userId } = req.user
    const { id: eventId } = req.params

    if (!eventId) {
        return next(
            new AppError(
                'Please, check the podcast id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const data = await Event.findById(eventId).populate(
        'createdBy',
        'name photo country language'
    )

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data,
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})
const createEvent = catchAsync(async (req, res, next) => {
    // try {
    const { date, description, name } = req.body
    const { id: userId } = req.user
    const isDateAfterNow = () => {
        return new Date(Date.now()) < new Date(date)
    }

    if (!date || !isDateAfterNow(date)) {
        return next(
            new AppError(
                'Please, check the date or the date is gone',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const data = await Event.create({
        createdBy: userId,
        date,
        description,
        name,
    })

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data,
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

const updateEvent = catchAsync(async (req, res, next) => {
    // try {
    const { id: eventId } = req.params
    const { id: userId } = req.user
    const { name, description, date } = req.body
    const isDateAfterNow = () => {
        return new Date(Date.now()) < new Date(date)
    }

    if (!date || !isDateAfterNow(date)) {
        return next(
            new AppError(
                'Please, check the date or the date is gone',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    if (!eventId) {
        return next(
            new AppError(
                'Please, check event id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const data = await Event.findOneAndUpdate(
        { _id: eventId, createdBy: userId },
        { name, description, date },
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
const deleteEvent = catchAsync(async (req, res, next) => {
    // try {
    const { id: eventId } = req.params
    const { id: userId } = req.user
    if (!eventId) {
        return next(
            new AppError(
                'Please, check event id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const data = await Event.findOneAndRemove({
        _id: eventId,
        createdBy: userId,
    })

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Event is removed',
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

const deleteEventById = catchAsync(async (req, res, next) => {
    // try {
    const { id: eventId } = req.params
    if (!eventId) {
        return next(
            new AppError(
                'Please, check event id param',
                StatusCodes.BAD_REQUEST
            )
        )
    }
    const data = await Event.findOneAndRemove({
        _id: eventId,
    })

    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Event is removed',
    })
    // } catch (error) {
    //     next(new AppError(error.message, StatusCodes.BAD_REQUEST))
    // }
})

module.exports = {
    getAllEvents,
    getEvent,
    createEvent,
    deleteEvent,
    deleteEventById,
    updateEvent,
    getAllFollowingEvents,
}
