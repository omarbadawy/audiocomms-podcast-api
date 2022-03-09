const mongoose = require('mongoose')
const dotenv = require('dotenv')
const http = require('http')
const User = require('./models/userModel')
const { Server } = require('socket.io')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const { cloudinaryConfig } = require('./utils/cloudinary')

process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION!!')
    console.log(err.name, err.message)
    process.exit(1)
})

dotenv.config()
const app = require('./app')

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: '*',
})

const DB = process.env.DATABASE

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => console.log('DB connection successful!'))

cloudinaryConfig()

const port = process.env.PORT || 3000

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    socket.user = user
    next()
})

io.on('connection', (socket) => {
    console.log(socket.user)
    console.log('client connected: ' + socket.id)
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg)
    })
})

const server = httpServer.listen(port, () => {
    console.log(`app running on port ${port}...........`)
})

process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION !!!!!!!!')
    console.log(err)
    server.close(() => {
        process.exit(1)
    })
})

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED, Shutting down gracefully')
    server.close(() => {
        console.log('Process Terminated')
    })
})
