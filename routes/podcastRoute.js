const express = require('express')

const router = express.Router()
const { protect } = require('../controllers/authController')
const {
    getAllPodcasts,
    getPodcast,
    createPodcast,
    updatePodcast,
    deletePodcast,
    getMyPodcasts,
    searchPodcast,
} = require('../controllers/podcastController')

const { uploadPodcast } = require('../utils/multer')

router.use(protect)

router.get('/search', searchPodcast)
router.get('/', getAllPodcasts)
router.get('/me', getMyPodcasts)
router.get('/:id', getPodcast)
router.post('/', uploadPodcast, createPodcast)
router.patch('/:id', updatePodcast)
router.delete('/:id', deletePodcast)

module.exports = router
