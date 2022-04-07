module.exports = (name) => {
    let hash = 0,
        chr
    if (name.length === 0) return hash
    for (let i = 0; i < name.length; i++) {
        chr = name.charCodeAt(i)
        hash = (hash << 5) - hash + chr
        hash |= 0
    }
    return hash < 0 ? hash * -1 : hash
}
