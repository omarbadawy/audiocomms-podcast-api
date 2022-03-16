const express = require('express')

const likesRouter = require('./likesRoute')

const router = express.Router()
const { protect, restrictTo } = require('../controllers/authController')

const {
    getAllPodcasts,
    getPodcast,
    createPodcast,
    updatePodcast,
    deletePodcast,
    deletePodcastById,
    getMyPodcasts,
    getMyFollowingPodcasts,
    searchPodcast,
    generateSignature,
} = require('../controllers/podcastController')

router.use(protect)

router.get('/', getAllPodcasts)
router.get('/me', getMyPodcasts)
router.get('/following/me', getMyFollowingPodcasts)

router.get('/search', searchPodcast)
router.get('/generateSignature', generateSignature)

router.get('/:id', getPodcast)

router.post('/', createPodcast)
router.patch('/:id', updatePodcast)
router.delete('/:id', deletePodcast)

router.delete('/admin/:id', restrictTo('admin'), deletePodcastById)

router.use('/likes', likesRouter)

module.exports = router
