const express = require('express')

const {
    getAllRoomChat,
    getMessage,
    searchRoomChat,
    deleteMessage,
} = require('../controllers/roomChatController')
const { restrictTo } = require('../controllers/authController')

const router = express.Router({
    mergeParams: true,
})

router.get('/', getAllRoomChat)
router.get('/search', searchRoomChat)
router.get('/:id', getMessage)

router.use(restrictTo('admin'))
router.delete('/:id', deleteMessage)

module.exports = router
