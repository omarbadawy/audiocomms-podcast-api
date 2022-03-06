const express = require('express')
const {
    getMyLikes,
    addLike,
    removeLike,
} = require('../controllers/likesController')

const router = express.Router()

router.get('/me', getMyLikes)
router.post('/:id', addLike)
router.delete('/:id', removeLike)

module.exports = router
