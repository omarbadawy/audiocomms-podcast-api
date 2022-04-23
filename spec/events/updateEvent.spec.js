const app = require('../../app')
const request = require('supertest')
const assert = require('chai').assert
const mongoose = require('mongoose')

const Event = require('../../models/eventModel')
const User = require('../../models/userModel')

require('dotenv').config()

// test update Event Endpoint
describe('PATCH /api/v1/events/:id', () => {
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
        event = await Event.findOne({ createdBy: selectedUser._id })
    })

    it('Should Return 400 with invalid date on event data', async () => {
        const eventData = {
            // name: event.name,
            date: new Date('0/5/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)
        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, check the date or Invalid date')
    })

    it('Should Return 400 with send date before now on event data', async () => {
        const eventData = {
            // name: event.name,
            date: new Date('4/4/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, the date is gone')
    })

    it('Should Return 400 with send date after 2 weeks on event data', async () => {
        const eventData = {
            // name: event.name,
            date: new Date('4/30/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, Enter date not after 2 weeks')
    })

    it('Should Return 400 with send date after 2 weeks on event data', async () => {
        const eventData = {
            // name: event.name,
            date: new Date('4/30/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'Please, Enter date not after 2 weeks')
    })

    it('Should Return 400 with name already exist on event data', async () => {
        const [eventData] = await Event.find({})
            .sort('date')
            .select('name')
            .limit(1)
        // console.log(eventData)
        // const eventData = {
        //     name: 'test event 4',
        //     // date: new Date('4/30/2022 12:00 PM').toLocaleString(),
        // }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send({ name: eventData.name })

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            `Duplicate field value: {"name":"${eventData.name}"}. Please use another value`
        )
    })

    it('Should Return 400 with name > 60 characters on event data', async () => {
        const eventData = {
            name: 'test'.repeat(60),
            // date: new Date('4/30/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, name must be less than 60 characters'
        )
    })

    it('Should Return 400 with name < 5 characters on event data', async () => {
        const eventData = {
            name: 'test',
            // date: new Date('4/30/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 400)
        assert.equal(
            res.body.message,
            'Invalid input data. Please, name must be more than 5 characters'
        )
    })

    it('Should Return 400 with send event id not found on param', async () => {
        const eventData = {
            name: 'test test',
            description: 'uuuuuuuu',
            date: new Date('4/13/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${user.data.user._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)
        assert.equal(res.statusCode, 404)
        assert.equal(res.body.message, 'Not found')
    })

    it('Should Return 200 with send event data', async () => {
        const eventData = {
            name: 'test event now 6',
            description: 'uuuuuuuu',
            date: new Date('4/15/2022 12:00 PM').toLocaleString(),
        }
        const res = await request(app)
            .patch(`/api/v1/events/${event._id}`)
            .set('Authorization', `Bearer ${user.token}`)
            .set('Accept', 'application/json')
            .send(eventData)

        assert.equal(res.statusCode, 200)
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
