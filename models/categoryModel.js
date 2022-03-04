const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A category must have a name'],
        unique: true,
        trim: true,
        maxlength: [
            25,
            'A category name must have less or equal than 25 characters',
        ],
        minlength: [
            2,
            'A category name must have more or equal than 2 characters',
        ],
    },
})

const Category = mongoose.model('Category', categorySchema)

module.exports = Category
