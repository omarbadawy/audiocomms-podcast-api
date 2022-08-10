const app = require('../app')
const request = require('supertest')
const mongoose = require('mongoose')
const User = require('../models/userModel')
const assert = require('chai').assert

require('dotenv').config()

describe('Auth and User routes', () => {
    let token

    before(async () => {
        await mongoose.connect(process.env.DATABASE_TEST, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        })

        console.log('DB connected')

        await User.deleteMany({})
    })

    after(async () => {
        await User.deleteMany({})
        await mongoose.disconnect()
    })

    it('Should return 201 when creating user', async () => {
        const res = await request(app)
            .post('/api/v1/users/signup')
            .send({
                name: 'test',
                email: 'test@test.com',
                password: 'test1234',
                passwordConfirm: 'test1234',
                country: 'egypt',
                language: 'arabic',
            })
            .set('Accept', 'application/json')

        token = res.body.token
        assert.equal(res.statusCode, 201)
    })

    it('Should return 401 without bearer token', async () => {
        const res = await request(app).get('/api/v1/users')
        assert.equal(res.statusCode, 401)
    })

    it('Should return 200 with bearer token', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token}`)
        assert.equal(res.statusCode, 200)
    })
})
