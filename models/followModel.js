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

module.exports = mongoose.model('Follow', followSchema)
