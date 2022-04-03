const multer = require('multer')
const Datauri = require('datauri')
const path = require('path')
const DataURIParser = require('datauri/parser')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const storage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        const supportedFormats = [
            'jpeg',
            'png',
            'webp',
            'avif',
            'tiff',
            'gif',
            'svg',
        ]
        const isSupportedImageFormat = (img) => {
            return supportedFormats.some(
                (format) => img.mimetype.split('/')[1] === format
            )
        }
        if (!isSupportedImageFormat(file)) {
            cb(
                new AppError(
                    `Unsupported image format. please provide image with this formats ${supportedFormats.join(
                        ' , '
                    )}`,
                    StatusCodes.BAD_REQUEST
                )
            )
        }
        cb(null, true)
    } else {
        cb(
            new AppError(
                'Not an image, Please upload only images',
                StatusCodes.BAD_REQUEST
            )
        )
    }
}

const multerUploads = multer({
    storage,
    limits: { fileSize: 2097152 },
    fileFilter: multerFilter,
}).single('photo')

const dUri = new DataURIParser()
/**
 * @description This function converts the buffer to data url
 * @param {Object} req containing the field object
 * @returns {String} The data url from the string buffer
 */

const dataUri = (req) =>
    dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer)

module.exports = {
    multerUploads,
    dataUri,
}
