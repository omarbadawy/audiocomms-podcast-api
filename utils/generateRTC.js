const Agora = require('agora-access-token')

module.exports = (user, isPublisher) => {
    const expiredTimeInSeconds = 18000
    const privilegeExpiredTs =
        Math.floor(Date.now() / 1000) + expiredTimeInSeconds

    const userRole = isPublisher
        ? Agora.RtcRole.PUBLISHER
        : Agora.RtcRole.SUBSCRIBER

    try {
        const token = Agora.RtcTokenBuilder.buildTokenWithUid(
            process.env.APP_ID,
            process.env.APP_CERTIFICATE,
            user.roomName,
            user.uid,
            userRole,
            privilegeExpiredTs
        )

        return token
    } catch (err) {
        console.log('Agora token Generation Error', err)
    }
}
