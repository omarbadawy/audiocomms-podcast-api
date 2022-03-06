const express = require('express')
const {
    getMyLikes,
    addLike,
    removeLike,
    getPodcastLikes,
} = require('../controllers/likesController')

const router = express.Router()

router.get('/me', getMyLikes)
router.get('/:id', getPodcastLikes)
router.post('/:id', addLike)
router.delete('/:id', removeLike)

module.exports = router
