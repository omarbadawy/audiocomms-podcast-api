const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Please, provide the podcast name'],
            minLength: [5, 'Please, name must be more than 5 characters'],
            maxLength: [60, 'Please, name must be less than 60 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please, provide the description'],
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
    },
    { timestamps: true }
)

eventSchema.index({ name: 'text' })

// eventSchema.methods.isDateAfterNow = function () {
//     return new Date(Date.now()) < new Date(this.date)
// }

module.exports = mongoose.model('Event', eventSchema)
