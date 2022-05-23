const User = require('../models/userModel')
const Podcast = require('../models/podcastModel')
const Event = require('../models/eventModel')

const restrictedWords = ['fuck', 'احا']
const regex = restrictedWords.join('|')

const removeUsers = async () => {
    await User.updateMany(
        {
            $or: [
                {
                    name: {
                        $regex: regex,
                    },
                },
                {
                    bio: {
                        $regex: regex,
                    },
                },
            ],
        },
        {
            active: false,
        }
    ).lean()
}

const removePodcasts = async () => {
    await Podcast.deleteMany({
        name: {
            $regex: regex,
        },
    }).lean()
}

const removeEvents = async () => {
    await Event.deleteMany({
        $or: [
            {
                name: {
                    $regex: regex,
                },
            },
            {
                description: {
                    $regex: regex,
                },
            },
        ],
    }).lean()
}

const removeRestrictedData = async () => {
    console.log('/////////////////////////////////////////////')
    console.log('start check restriction.')
    await removeUsers()
    await removePodcasts()
    await removeEvents()
    console.log('finish check restriction.')
    console.log('/////////////////////////////////////////////')
}

module.exports = removeRestrictedData
