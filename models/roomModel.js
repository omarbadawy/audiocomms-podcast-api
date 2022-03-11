const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Please, provide the podcast name'],
            minLength: [5, 'Please, name must be more than 5 characters'],
            maxLength: [60, 'Please, name must be less than 60 characters'],
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
        isActivated: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

roomSchema.index({ name: 'text' })
module.exports = mongoose.model('Room', roomSchema)
