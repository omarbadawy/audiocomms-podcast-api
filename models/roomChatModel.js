const mongoose = require('mongoose')

const roomChatSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Types.ObjectId,
            ref: 'Room',
        },
        user: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
        to: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
        message: {
            type: String,
            minLength: [1, 'Please, message must be more than 1 characters'],
            maxLength: [
                500,
                'Please, message must be less than 500 characters',
            ],
        },
        status: {
            type: String,
            trim: true,
            lowercase: true,
            enum: ['private', 'public'],
            default: 'public',
        },
    },
    { timestamps: true }
)

roomChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 * 60 * 1000 })
roomChatSchema.index({ message: 'text', message: 1 })

module.exports = mongoose.model('RoomChat', roomChatSchema)
