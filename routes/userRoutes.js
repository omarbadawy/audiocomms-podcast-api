const express = require('express')
const { multerUploads } = require('../utils/multer')
const {
    login,
    signup,
    protect,
    restrictTo,
    updatePassword,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController')

const {
    deleteMe,
    deleteUser,
    getAllFullUsers,
    getAllUsers,
    getMe,
    getUser,
    getFullUser,
    updateUser,
    updateMe,
    getUnfollowedUsers,
    searchUser,
} = require('../controllers/userController')

const {
    followUser,
    getUserFollowing,
    unFollowUser,
    getUserFollowers,
} = require('../controllers/followController')

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/forgotPassword', forgotPassword)
router.patch('/resetPassword/:token', resetPassword)

router.patch('/updateMe', multerUploads, protect, updateMe)

// Protect all the routes after this
router.use(protect)
router.get('/search', searchUser)

router.patch('/updateMyPassword', updatePassword)

router.get('/', getAllUsers)
router.get('/discover', getUnfollowedUsers)
router.get('/me', getMe, getFullUser)
router.get('/:id', getUser)

router.get('/me/following', getMe, getUserFollowing)
router.get('/me/followers', getMe, getUserFollowers)
router
    .route('/:id/following')
    .get(getUserFollowing)
    .post(followUser)
    .delete(unFollowUser)
router.get('/:id/followers', getUserFollowers)

router.delete('/deleteMe', deleteMe)

// Restrict all the routes to admin after this
router.use(restrictTo('admin'))

router.route('/admin/').get(getAllFullUsers)
router.route('/admin/:id').get(getFullUser).patch(updateUser).delete(deleteUser)

module.exports = router
