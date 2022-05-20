const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Please, provide the event name'],
            minLength: [2, 'Please, name must be more than 2 characters'],
            maxLength: [60, 'Please, name must be less than 60 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please, provide the description'],
        },
        isInterested: {
            type: Boolean,
            default: false,
        },
        date: {
            type: Date,
            required: [true, 'Please, provide the date'],
            validate: [Date.parse, 'the date is invalid'],
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please, provide the user ID'],
        },
        expireAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
)
eventSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })
eventSchema.index({ name: 'text' })

module.exports = mongoose.model('Event', eventSchema)
