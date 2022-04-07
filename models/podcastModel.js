const mongoose = require('mongoose')

const podcastSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Please, provide the podcast name'],
            minLength: [5, 'Please, name must be more than 5 characters'],
            maxLength: [60, 'Please, name must be less than 60 characters'],
        },
        likes: {
            type: Number,
            default: 0,
        },
        category: {
            type: String,
            required: [true, 'Please, provide the podcast category'],
        },
        audio: {
            url: {
                type: String,
                required: [true, 'Please, provide the audio of podcast'],
            },
            publicID: {
                type: String,
            },
            duration: {
                type: Number,
                default: 0,
            },
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please, provide the user ID'],
        },
    },
    { timestamps: true }
)

podcastSchema.index({ name: 'text' })
podcastSchema.index({ createdBy: 1 })
module.exports = mongoose.model('Podcast', podcastSchema)
