const express = require('express')
const {
    createCategory,
    deleteCategory,
    getAllCategories,
    updateCategory,
} = require('../controllers/categoryController')
const { protect, restrictTo } = require('../controllers/authController')

const router = express.Router()

router
    .route('/')
    .get(getAllCategories)
    .post(protect, restrictTo('admin'), createCategory)

// Protect all the routes after this
router.use(protect)

// Restrict all the routes to admin after this
router.use(restrictTo('admin'))

router.route('/:id').patch(updateCategory).delete(deleteCategory)

module.exports = router
