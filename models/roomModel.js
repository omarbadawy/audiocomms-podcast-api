const mongoose = require('mongoose')
const validator = require('validator')

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Please, provide the podcast name'],
            minLength: [2, 'Please, name must be more than 2 characters'],
            maxLength: [60, 'Please, name must be less than 60 characters'],
            validate: [
                (v) => validator.isAlphanumeric(v, 'en-US', { ignore: ' ' }),
                'Name must be en-US alphanumeric',
            ],
        },
        category: {
            type: String,
            required: [true, 'Please, provide the podcast category'],
        },
        admin: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please, provide the user ID'],
        },
        audience: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
        brodcasters: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
        status: {
            type: String,
            required: [true, 'should the room be private or public ?'],
            trim: true,
            lowercase: true,
            enum: ['private', 'public'],
        },
        timerId: {
            type: Number,
        },
        isRecording: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 18000 })
roomSchema.index({ name: 'text', name: 1 })
module.exports = mongoose.model('Room', roomSchema)
