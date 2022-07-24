const express = require('express')

const {
    getAllRoomChat,
    getMessage,
    searchRoomChat,
    deleteMessage,
} = require('../controllers/roomChatController')
const { protect, restrictTo } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.get('/room/:id', getAllRoomChat)
router.get('/room/:id/search', searchRoomChat)
router.get('/:id', getMessage)

router.use(restrictTo('admin'))
router.delete('/:id', deleteMessage)

module.exports = router
