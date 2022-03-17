const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const Email = require('../utils/email')

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)

    // Remove the password from the output
    user.password = undefined
    user.active = undefined
    user.__v = undefined

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        country: req.body.country,
        language: req.body.language,
        userType: req.body.userType,
    })

    createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    // 1) Check if email and passwords exists
    if (!email || !password) {
        return next(new AppError('Please provide email and passowrd!', 400))
    }

    // 2) Check if user exists && password is correct
    // select(+password) used because i prevented it from User Schema
    const user = await User.findOne({ email, active: true }).select(
        '+password +email'
    )

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect Email or Password!', 401))
    }

    // 3) if everything is ok, send token to the client
    createSendToken(user, 200, res)
})

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting the token and check if it exists
    let token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        return next(
            new AppError(
                'You are not logged in! Please log in to get access.',
                401
            )
        )
    }
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+email')
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token does no longer exist.',
                401
            )
        )
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed the password! Please log in again.',
                401
            )
        )
    }

    // Grant Access To A Protected Route
    req.user = currentUser
    next()
})

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You don't have permission to perform this action!",
                    403
                )
            )
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // Get user based on  posted email
    const user = await User.findOne({ email: req.body.email }).select('+email')
    if (!user) {
        return next(new AppError('There is no user with email address.', 404))
    }

    // Generate the random reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false }) // save the document after modifying it

    // Send it back as an email

    try {
        const resetURL = `https://arch-club.vercel.app/archclub/sign/reset-password.html?token=${resetToken}`

        await new Email(user, resetURL).sendPasswordReset()

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        })
    } catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined

        await user.save({ validateBeforeSave: false })
        return next(
            new AppError(
                'There was an error sending the email. Try again later!',
                500
            )
        )
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    })

    // If token has not expired and there is a user => set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()

    // Update changedPasswordAt property for the user
    // I put a middleware to do it on the userSchema

    // log the user in, send the JWT
    createSendToken(user, 200, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    if (
        !req.body.passwordCurrent ||
        !req.body.password ||
        !req.body.passwordConfirm
    ) {
        return next(new AppError('Please fill the data', 401))
    }

    // Get the user from collection
    const user = await User.findById(req.user.id).select('+password')

    // Check if the posted password is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError('Invalid password', 401))
    }

    // If the password is correct then update the password
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save() // findByIdAndUpdate won't work because of the validators and pre save middlewares!!!!

    // log the user in , send JWT
    createSendToken(user, 200, res)
})
