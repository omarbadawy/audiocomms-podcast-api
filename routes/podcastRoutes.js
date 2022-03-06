const express = require('express')

const likesRouter = require('./likesRoute')

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
    generateSignature,
} = require('../controllers/podcastController')

const { uploadPodcast } = require('../utils/multer')

router.use(protect)

router.get('/', getAllPodcasts)
router.get('/me', getMyPodcasts)
router.get('/:id', getPodcast)

router.post('/', uploadPodcast, createPodcast)
router.patch('/:id', updatePodcast)
router.delete('/:id', deletePodcast)

router.get('/search', searchPodcast)
router.get('/generateSignature', generateSignature)

router.use('/likes', likesRouter)

module.exports = router
