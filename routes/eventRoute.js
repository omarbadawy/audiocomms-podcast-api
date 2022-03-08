const express = require('express')
const {
    getAllEvents,
    getEvent,
    createEvent,
    deleteEvent,
    updateEvent,
    deleteEventById,
    getAllFollowingEvents,
} = require('../controllers/eventsController')

const { protect, restrictTo } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.get('/admin', restrictTo('admin'), getAllEvents)

router.get('/me', getAllFollowingEvents)
router.get('/:id', getEvent)
router.post('/me', createEvent)
router.patch('/:id', updateEvent)
router.delete('/:id', deleteEvent)

router.delete('/admin/:id', restrictTo('admin'), deleteEventById)

module.exports = router
