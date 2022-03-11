const express = require('express')

const {
    createRoom,
    getAllRooms,
    getRoom,
    generateAgoraToken,
    searchRoom,
} = require('../controllers/roomController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.route('/').get(getAllRooms).post(createRoom)
router.get('/generateToken', generateAgoraToken)
router.get('/search', searchRoom)
router.get('/:id', getRoom)

module.exports = router
