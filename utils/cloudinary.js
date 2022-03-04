const { config, uploader, utils } = require('cloudinary').v2

const cloudinaryConfig = (req, res, next) => {
    config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET,
    })
}

const createImageUpload = async () => {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = utils.api_sign_request(
        {
            timestamp,
            folder: 'potcasts',
            eager: 'c_pad,h_300,w_400|c_crop,h_200,w_260',
        },
        process.env.CLOUD_API_SECRET
    )
    return { timestamp, signature }
}

module.exports = {
    createImageUpload,
    uploader,
    cloudinaryConfig,
}
