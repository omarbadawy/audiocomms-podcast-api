const express = require('express')
const {
    getAllLikes,
    getMyLikes,
    addLike,
    removeLike,
    getPodcastLikes,
    removeLikeByPodcastId,
} = require('../controllers/likesController')

const router = express.Router()
const { protect, restrictTo } = require('../controllers/authController')

router.use(protect)

router.get('/admin/', restrictTo('admin'), getAllLikes)

router.get('/me', getMyLikes)
router.get('/:id', getPodcastLikes)
router.post('/:id', addLike)
router.delete('/:id', removeLike)

router.delete('/admin/:id', restrictTo('admin'), removeLikeByPodcastId)

module.exports = router
