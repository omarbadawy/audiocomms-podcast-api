const { unlink } = require('fs')
const path = require('path')
const removeFile = (filePath) => {
    unlink(path.join(__dirname, '..', filePath), (err) => {
        if (err) console.log(err)
        else console.log('file is deleted')
    })
}

module.exports = removeFile
