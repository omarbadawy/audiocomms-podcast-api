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

const getMyEvents = catchAsync(async (req, res, next) => {
    const { id: userId } = req.user
    const allEventsData = new ApiFeatures(
        Event.find({ createdBy: userId }).populate(
            'createdBy',
            'name photo country language'
        ),
        req.query
    ).filter()

    let eventsData = new ApiFeatures(
        Event.find({ createdBy: userId }).populate(
            'createdBy',
            'name photo country language'
        ),
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
        results: eventsData.length,
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
        results: eventsData.length,
        docsCount,
    })
})
const getEvent = catchAsync(async (req, res, next) => {
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
})

const createEvent = catchAsync(async (req, res, next) => {
    const { date, description, name, isInterested } = req.body
    const { id: userId } = req.user

    const isDateAfterNow = () => {
        return new Date(Date.now()) < new Date(date)
    }
    const isDateAfterTwoWeeks = () => {
        return new Date(Date.now() + 1209600000) < new Date(date)
    }

    if (!date || !Date.parse(date)) {
        return next(
            new AppError(
                'Please, check the date or Invalid date',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    if (!isDateAfterNow(date)) {
        return next(
            new AppError('Please, the date is gone', StatusCodes.BAD_REQUEST)
        )
    }

    if (isDateAfterTwoWeeks(date)) {
        return next(
            new AppError(
                'Please, Enter date not after 2 weeks',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const data = await Event.create({
        createdBy: userId,
        date: new Date(date),
        description,
        name,
        isInterested: isInterested === true ? true : false,
        expireAt: new Date(date),
    })

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data,
    })
})

const updateEvent = catchAsync(async (req, res, next) => {
    const { id: eventId } = req.params
    const { id: userId } = req.user
    const { name, description, date, isInterested } = req.body
    const updatedObj = {}

    if (name) updatedObj.name = name
    if (description) updatedObj.description = description
    updatedObj.isInterested = isInterested === true ? true : false

    const isDateAfterNow = () => {
        return new Date(Date.now()) < new Date(date)
    }
    const isDateAfterTwoWeeks = () => {
        return new Date(Date.now() + 1209600000) < new Date(date)
    }

    if (date) {
        if (!date || !Date.parse(date)) {
            return next(
                new AppError(
                    'Please, check the date or Invalid date',
                    StatusCodes.BAD_REQUEST
                )
            )
        }

        if (!isDateAfterNow(date)) {
            return next(
                new AppError(
                    'Please, the date is gone',
                    StatusCodes.BAD_REQUEST
                )
            )
        }
        if (isDateAfterTwoWeeks(date)) {
            return next(
                new AppError(
                    'Please, Enter date not after 2 weeks',
                    StatusCodes.BAD_REQUEST
                )
            )
        }

        updatedObj['date'] = new Date(date)
        updatedObj['expireAt'] = new Date(date)
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
        updatedObj,
        {
            new: true,
            runValidators: true,
        }
    ).populate('createdBy', 'name photo country language')
    if (!data) {
        return next(new AppError('Not found', StatusCodes.NOT_FOUND))
    }
    res.status(StatusCodes.OK).json({ status: 'success', data })
})
const deleteEvent = catchAsync(async (req, res, next) => {
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
})

const deleteEventById = catchAsync(async (req, res, next) => {
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
})

module.exports = {
    getAllEvents,
    getEvent,
    getMyEvents,
    createEvent,
    deleteEvent,
    deleteEventById,
    updateEvent,
    getAllFollowingEvents,
}
