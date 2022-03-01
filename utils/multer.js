const multer = require('multer')
const Datauri = require('datauri')
const path = require('path')
const DataURIParser = require('datauri/parser')
const AppError = require('../utils/appError')

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
}).single('imageCover')

const dUri = new DataURIParser()
/**
 * @description This function converts the buffer to data url
 * @param {Object} req containing the field object
 * @returns {String} The data url from the string buffer
 */

const dataUri = (req) =>
    dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer)

module.exports = { multerUploads, dataUri }
