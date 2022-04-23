const app = require('../../app')
const request = require('supertest')
const assert = require('chai').assert
const mongoose = require('mongoose')

const Event = require('../../models/eventModel')
const User = require('../../models/userModel')

require('dotenv').config()

// test get Event Endpoint
describe('GET /api/v1/events/:id', () => {
    let user
    let event

    before(async () => {
        await mongoose.connect(process.env.DUMMY_DATABASE, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        })

        const selectedUser = await User.findById('624b686c8ec8a83205bf7daf')
        const password = '123456789'

        // create user and get user data.
        const res = await request(app)
            .post('/api/v1/users/login')
            .set('Accept', 'application/json')
            .send({
                email: `${selectedUser.name}@gmail.com`,
                password,
            })

        user = res.body

        // get any event for user
        event = await Event.findOne({ createdBy: selectedUser._id }).populate(
            'createdBy',
            'name photo country language'
        )
    })

    it('Should Return 404 with send event id not found', async () => {
        const res = await request(app)
            .get(`/api/v1/events/${user.data.user._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
        // .send(eventData)
        assert.equal(res.statusCode, 404)
        assert.equal(res.body.message, 'Not found')
    })

    it('Should Return 200 with send event data', async () => {
        const res = await request(app)
            .get(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
        // .send(eventData)
        const eventData = res.body.data
        assert.equal(res.statusCode, 200)
        assert.equal(res.body.status, 'success')
        assert.equal(eventData.date, eventData.expireAt)
        assert.deepEqual(
            {
                name: eventData.name,
                description: eventData.description,
                date: new Date(eventData.date).toLocaleString(),
            },
            {
                name: event.name,
                description: event.description,
                date: new Date(event.date).toLocaleString(),
            }
        )
    })

    after(async () => {
        await mongoose.disconnect()
    })
})
