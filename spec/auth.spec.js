const app = require('../app')
const request = require('supertest')
const assert = require('chai').assert
const mongoose = require('mongoose')

require('dotenv').config()

describe('Handle authorization on APIS', () => {
    let token

    before(async () => {
        await mongoose.connect(process.env.DATABASE, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        })
    })

    it('Should return 401 if send request without bearer token', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Accept', 'application/json')
        assert.equal(res.statusCode, 401)
        assert.equal(
            res.body.message,
            'You are not logged in! Please log in to get access.'
        )
    })

    it('Should return 401 if send request without starts with Bearer on token', async () => {
        token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNDlhYjAzY2VkNzJiMDAxNmM2NGU0NyIsImlhdCI6MTY0ODk5NTA3NSwiZXhwIjoxNjU2NzcxMDc1fQ.H2LLD0xzZffXBo7yP5xed3Dg5TspNniSTLgV5BxqdLM'
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', token)
            .set('Accept', 'application/json')
        assert.equal(res.statusCode, 401)
        assert.equal(
            res.body.message,
            'You are not logged in! Please log in to get access.'
        )
    })

    it('Should return 401 if send request with starts with Bearer on token but invalid token', async () => {
        token = 'qqqqqqqqqq'
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
        assert.equal(res.statusCode, 401)
        assert.equal(res.body.message, 'Invalid token! Please log in again.')
    })

    it('Should return 401 if send request with  Bearer token but user changed his password', async () => {
        token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNDlhYmVhY2VkNzJiMDAxNmM2NGU1NCIsImlhdCI6MTY0ODk5NTkxMCwiZXhwIjoxNjU2NzcxOTEwfQ.UzmXU8Dz-OqwMNAkmNerpYFvkkI8FRvTN1amyBijze0'
        const res = await request(app)
            .get('/api/v1/events')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
        assert.equal(res.statusCode, 401)
        assert.equal(
            res.body.message,
            'User recently changed the password! Please log in again.'
        )
    })

    it('Should return 401 if send request with starts with Bearer token but user is not exist', async () => {
        token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNDliNzI4Y2VkNzJiMDAxNmM2NGU2NCIsImlhdCI6MTY0ODk5ODE4NCwiZXhwIjoxNjU2Nzc0MTg0fQ.V1v_itWSWAM_DbG8D2w1wLNQWKwMMZa3xceTLohZF-A'
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
        assert.equal(res.statusCode, 401)
        assert.equal(
            res.body.message,
            'The user belonging to this token does no longer exist.'
        )
    })

    after(async () => {
        await mongoose.disconnect()
    })
})

