const app = require('../../app')
const request = require('supertest')
const assert = require('chai').assert
const mongoose = require('mongoose')

const Event = require('../../models/eventModel')

require('dotenv').config()

// test create Event Endpoint
describe('POST /api/v1/events/me', () => {
    let user

    before(async () => {
        await mongoose.connect(process.env.DUMMY_DATABASE, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        })

        const randomName = `test${(Math.random() * 100).toFixed(4)}`

        // create user and get user dataInvalid input data.
        const res = await request(app)
            .post('/api/v1/users/signup')
            .set('Accept', 'application/json')
            .send({
                name: `${randomName}`,
                email: `${randomName}@gmail.com`,
                role: 'user',
                country: 'egypt',
                language: 'arabic',
                userType: 'podcaster',
                password: '123456789',
                passwordConfirm: '123456789',
            })
        user = res.body
    })

    it('Should Return 400 without send event data in body', async () => {
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, check the date or Invalid date')
    })

    it('Should Return 400 without send name on event data', async () => {
        const eventData = {
            description: 'testtttttttttt',
            date: new Date('4/15/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, provide the event name'
        )
    })
    it('Should Return 400 without send description on event data', async () => {
        const eventData = {
            name: 'testtttttttttt',
            date: new Date('4/16/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, provide the description'
        )
    })

    it('Should Return 400 with send invalid date on event data', async () => {
        const eventData = {
            name: 'testtttttttttt',
            date: '0/0/0',
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, check the date or Invalid date')
    })

    it('Should Return 400 with send date before now on event data', async () => {
        const eventData = {
            name: 'testtttttttttt',
            date: '4/3/2022',
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, the date is gone')
    })

    it('Should Return 400 with send date after 2 weeks on event data', async () => {
        const eventData = {
            name: 'testtttttttttt',
            date: '4/26/2022',
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, Enter date not after 2 weeks')
    })

    it('Should Return 400 with send name already exist on event data', async () => {
        const eventData = {
            name: 'test event',
            description: 'testtttttttttt',
            date: new Date('4/6/2022 4:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            `Duplicate field value: {"name":"${eventData.name}"}. Please use another value`
        )
    })

    it('Should Return 400 with send name > 60 characters on event data', async () => {
        const eventData = {
            name: 'test'.repeat(60),
            description: 'testtttttttt',
            date: new Date('4/16/2022').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, name must be less than 60 characters'
        )
    })

    it('Should Return 400 with send name < 5 characters on event data', async () => {
        const eventData = {
            name: 'test',
            description: 'testtttttttt',
            date: new Date('4/16/2022').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, name must be more than 5 characters'
        )
    })

    it('Should Return 200 with send event data', async () => {
        const eventData = {
            name: 'test event' + Math.random().toFixed(5),
            description: 'testtttttttt',
            date: new Date('4/16/2022').toLocaleString(),
        }
        const res = await request(app)
            .post('/api/v1/events/me')
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 201)
        assert.equal(res.body.status, 'success')
        assert.equal(res.body.data.date, res.body.data.expireAt)
        assert.deepEqual(
            {
                name: res.body.data.name,
                description: res.body.data.description,
                date: new Date(res.body.data.date).toLocaleString(),
            },
            eventData
        )
    })
    after(async () => {
        await mongoose.disconnect()
    })
})
