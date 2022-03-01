const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const APIFeatures = require('../utils/apiFeatures')

exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id)

        if (!doc) {
            return next(new AppError('No document Found With That ID', 404))
        }

        res.status(204).json({
            status: 'success',
            data: null,
        })
    })

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })

        if (!doc) {
            return next(new AppError('No document Found With That ID', 404))
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        })
    })

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.create(req.body)
        res.status(201).json({
            status: 'success',
            data: {
                data: doc,
            },
        })
    })

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id)

        if (populateOptions) {
            query = query.populate(populateOptions)
        }

        const doc = await query

        if (!doc) {
            return next(new AppError('No document Found With That ID', 404))
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        })
    })

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        const featuresBeforePagination = new APIFeatures(
            Model.find(),
            req.query
        ).filter()

        const features = new APIFeatures(Model.find(), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate()

        // const docs = await features.query.explain()
        const docs = await features.query
        const docsCount = await Model.countDocuments(
            featuresBeforePagination.query
        )

        res.status(200).json({
            status: 'success',
            results: docs.length,
            docsCount,
            data: {
                data: docs,
            },
        })
    })
