const express = require('express')

const {
    createRoom,
    getAllRooms,
    getRoom,
    generateAgoraToken,
    searchRoom,
    deleteRoom,
} = require('../controllers/roomController')
const { protect, restrictTo } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.route('/').get(getAllRooms).post(createRoom)
router.get('/generateToken', generateAgoraToken)
router.get('/search', searchRoom)
router.get('/:id', getRoom)

router.use(restrictTo('admin'))
router.delete('/:id', deleteRoom)

module.exports = router
