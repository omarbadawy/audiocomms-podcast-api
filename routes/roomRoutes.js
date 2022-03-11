const express = require('express')

const {
    createRoom,
    getAllRooms,
    getRoom,
} = require('../controllers/roomController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.route('/').get(getAllRooms).post(createRoom)
router.get('/:id', getRoom)

module.exports = router
