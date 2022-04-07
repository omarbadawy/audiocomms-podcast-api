const mongoose = require('mongoose')

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },

        following: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

followSchema.index({ follower: 1, following: 1 })

module.exports = mongoose.model('Follow', followSchema)
