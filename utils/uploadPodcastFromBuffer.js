const streamifier = require('streamifier')
const { uploader } = require('./cloudinary')

module.exports = (req) => {
    return new Promise((resolve, reject) => {
        let stream = uploader.upload_stream(
            { folder: 'podcasts', resource_type: 'video' },
            (error, result) => {
                if (result) {
                    resolve(result)
                } else {
                    reject(error)
                }
            }
        )

        streamifier.createReadStream(req.file.buffer).pipe(stream)
    })
}
