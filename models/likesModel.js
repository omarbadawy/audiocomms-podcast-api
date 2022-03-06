const mongoose = require('mongoose')

const likesSchema = new mongoose.Schema(
    {
        podcastId: {
            type: mongoose.Types.ObjectId,
            ref: 'Podcast',
        },
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Likes', likesSchema)
