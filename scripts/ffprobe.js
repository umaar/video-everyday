const ffmpeg = require('fluent-ffmpeg');

function getVideoMetadata(fullPath) {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(fullPath, (error, metadata) => {
			if (error) {
				console.log('Error with ffmpeg.ffprobe()', error);
				return reject(error);
			}

			resolve(metadata);
		});
	});
}

async function init() {
	const result = await getVideoMetadata('vid.MOV');

	console.log(result);
}

init();
