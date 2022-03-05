const mongoose = require('mongoose')

const likesSchema = new mongoose.Schema(
    {
        likeTo: {
            type: mongoose.Types.ObjectId,
            ref: 'Podcast',
        },
        likeBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Likes', likesSchema)
