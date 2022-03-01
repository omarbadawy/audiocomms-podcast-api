const { config, uploader } = require('cloudinary').v2

const cloudinaryConfig = (req, res, next) => {
    config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET,
    })
}

module.exports = {
    cloudinaryConfig,
    uploader,
}
