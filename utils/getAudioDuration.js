const { getAudioDurationInSeconds } = require("get-audio-duration");
const path = require("path");

const getAudioDuration = async (filePath) => {
  const duration = await getAudioDurationInSeconds(
    path.join(__dirname, "..", filePath)
  );
  return duration;
};

module.exports = { getAudioDuration };
