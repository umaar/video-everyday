const ffmpeg = require('fluent-ffmpeg');


function getVideoMetadata(fullPath) {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(fullPath, (err, metadata) => {
			if (err) {
				console.log('Error with ffmpeg.ffprobe()', err);
				return reject(err);
			}

			resolve(metadata);
		});
	});
}

async function init() {
	const result = await getVideoMetadata('vid.MOV')

	console.log(result);
}

init();