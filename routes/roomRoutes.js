const express = require('express')

const { createRoom, getAllRooms } = require('../controllers/roomController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.route('/').get(getAllRooms).post(createRoom)

module.exports = router
