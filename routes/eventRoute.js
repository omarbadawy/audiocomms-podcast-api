const express = require('express')
const {
    getAllEvents,
    getEvent,
    createEvent,
    deleteEvent,
    // searchEvent,
    updateEvent,
} = require('../controllers/eventsController')

const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)
router.get('/me', getAllEvents)
// router.get('/search', searchEvent)
router.get('/:id', getEvent)
router.post('/me', createEvent)
router.patch('/:id', updateEvent)
router.delete('/:id', deleteEvent)

module.exports = router
