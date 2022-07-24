module.exports = (error, defaultMessage) => {
    console.log(error)
    let message = defaultMessage
    if (error.kind === 'ObjectId')
        message = `Invalid ${error.path}: ${error.value}`

    if (error.message.toLowerCase().includes('agora')) {
        message = 'agora token failed'
    }
    if (error.code === 11000)
        message = `Duplicate field value: ${JSON.stringify(
            error.keyValue
        )}. Please use another value`

    if (error.message.toLowerCase().includes('validation failed')) {
        const errors = Object.values(error.errors).map((el) => el.message)

        message = `Invalid input data. ${errors.join('. ')}`
    }
    return message
}
