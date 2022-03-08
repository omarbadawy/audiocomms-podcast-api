const mongoose = require('mongoose')

const likesSchema = new mongoose.Schema(
    {
        podcast: {
            type: mongoose.Types.ObjectId,
            ref: 'Podcast',
        },
        user: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Likes', likesSchema)
