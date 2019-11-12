
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)

const fs = require("fs");
const path = require("path");
const config = require('config');
const mkdirp = require("mkdirp");



const videoSegmentFolder = config.get('video-segment-folder');
const defaultVideoSegmentDuration = config.get('video-segment-duration-seconds');
const mediaFolder = config.get('media-folder')


async function init({mediaFile, totalVideoDuration}) {
	const absoluteFilePathForMedia = path.join(mediaFolder, mediaFile);
	const videoSegmentFolderForMedia = path.join(videoSegmentFolder, mediaFile)
	const parsedMediaFileName = path.parse(mediaFile);

	mkdirp.sync(videoSegmentFolderForMedia);
	let newFileName;

	console.log({defaultVideoSegmentDuration, totalVideoDuration});

	// 5 is a minimum padding, in seconds which the video should have for MP4Box to do a split
	if ((defaultVideoSegmentDuration + 7) < totalVideoDuration) {
		const MP4BoxBinary = `/Applications/GPAC.app/Contents/MacOS/MP4Box`;
		const halfWayMark = Math.floor(totalVideoDuration / 2);
		const command = `(cd '${videoSegmentFolderForMedia}' && ${MP4BoxBinary} -splitx ${halfWayMark}:${halfWayMark + defaultVideoSegmentDuration} '${absoluteFilePathForMedia}')`

		console.log({command});
		const {stderr} = await exec(command)

		const indexOfFileName = stderr.indexOf( parsedMediaFileName.name );
		const indexOfFileExtension = stderr.indexOf( `${parsedMediaFileName.ext} - duration` );

		newFileName = stderr.substring(indexOfFileName, indexOfFileExtension + parsedMediaFileName.ext.length)
	} else {
		console.log(`This file is too small for segmenting ${mediaFile} with MP4Box`);


		const command = `cp '${absoluteFilePathForMedia}' '${videoSegmentFolderForMedia}'`;
		newFileName = `${parsedMediaFileName.name}${parsedMediaFileName.ext}`
		const {stderr} = await exec(command)
	}

	const newFileRelativePath = path.join(mediaFile, newFileName);

	const videoSegmentAbsolutePath = path.join(videoSegmentFolderForMedia, newFileName);

	const {ext} = path.parse(newFileName);

	const newCommand = `ffmpeg -y -i '${videoSegmentAbsolutePath}' -vf "scale=640:-2" '${videoSegmentAbsolutePath}.mini${ext}'`

	console.log('\n\n', newCommand, '\n\n');

	const {stderr: ffmpegStderr} = await exec(newCommand)

	return newFileRelativePath;
}

module.exports = init;