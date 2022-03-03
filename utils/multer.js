const multer = require('multer')
const sharp = require('sharp')
const Datauri = require('datauri')
const path = require('path')
const DataURIParser = require('datauri/parser')
const AppError = require('../utils/appError')
const { StatusCodes } = require('http-status-codes')
const storage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new AppError('Not an image, Please upload only images', 400))
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

const convertImg = async (buffer, imgName) => {
    const name = Date.now() + imgName
    const path = `./uploads/${name}.webp`
    const img = await sharp(buffer)
        .webp({ quality: 20 })
        .toFile(`./uploads/${name}.webp`)
    return path
}

const uploadPodcast = multer({
    storage: multer.diskStorage({
        destination: './uploads',
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio')) {
            cb(null, true)
        } else {
            cb(
                new AppError(
                    'Not an audio, Please upload only audios',
                    StatusCodes.BAD_REQUEST
                )
            )
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 },
}).single('audio')

module.exports = { multerUploads, uploadPodcast, dataUri, convertImg }
