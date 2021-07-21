
import {promisify} from 'util';
import {exec as execOld} from 'child_process';

import fs from 'fs';
import path from 'path';
import config from 'config';

import {getVideoDuration} from './get-media-metadata.js';

const exec = promisify(execOld);
const videoSegmentFolder = config.get('video-segment-folder');
const defaultVideoSegmentDuration = config.get('video-segment-duration-seconds');
const mediaFolder = config.get('media-folder');

async function init({mediaFile, totalVideoDuration}) {
	const absoluteFilePathForMedia = path.join(mediaFolder, mediaFile);
	const videoSegmentFolderForMedia = path.join(videoSegmentFolder, mediaFile);
	const parsedMediaFileName = path.parse(mediaFile);

	fs.mkdirSync(videoSegmentFolderForMedia, {
		recursive: true
	});

	const newFileName = `${parsedMediaFileName.name}-segment${parsedMediaFileName.ext}`;
	// Ffmpeg -i VID_20191210_112221.mp4  -ss 10 -to 11 -c copy cut.mp4
	// const ffmpegBinary = '/usr/local/bin/ffmpeg';
	const halfWayMark = Math.floor(totalVideoDuration / 2);
	// Const command = `(cd '${videoSegmentFolderForMedia}' && ${ffmpeg} -splitx ${halfWayMark}:${halfWayMark + defaultVideoSegmentDuration} '${absoluteFilePathForMedia}')`;
	const command = `ffmpeg -y -hide_banner -i '${absoluteFilePathForMedia}' -ss ${halfWayMark} -strict -2 -to ${halfWayMark + defaultVideoSegmentDuration} '${path.join(videoSegmentFolderForMedia, newFileName)}'`;

	const hrtime = process.hrtime()[1];
	console.log(`${command}`);

	console.time(`ffmpeg Video Segment Creation ${hrtime}`);
	try {
		await exec(command);
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}

	console.timeEnd(`ffmpeg Video Segment Creation ${hrtime}`);

	/*
	// 5 is a minimum padding, in seconds which the video should have for MP4Box to do a split
	if ((defaultVideoSegmentDuration + 7) < totalVideoDuration) {
		const MP4BoxBinary = '/Applications/GPAC.app/Contents/MacOS/MP4Box';
		const halfWayMark = Math.floor(totalVideoDuration / 2);
		const command = `(cd '${videoSegmentFolderForMedia}' && ${MP4BoxBinary} -splitx ${halfWayMark}:${halfWayMark + defaultVideoSegmentDuration} '${absoluteFilePathForMedia}')`;

		const hrtime = process.hrtime()[1];

		console.time(`MP4Box Video Segment Creation ${hrtime}`);
		let commandResult;
		try {
			commandResult = await exec(command);
		} catch (error) {
			console.log(error);
			throw new Error(error);
		}

		console.timeEnd(`MP4Box Video Segment Creation ${hrtime}`);

		const indexOfFileName = commandResult.stderr.indexOf(parsedMediaFileName.name);
		const indexOfFileExtension = commandResult.stderr.indexOf(`${parsedMediaFileName.ext} - duration`);

		newFileName = commandResult.stderr.slice(indexOfFileName, indexOfFileExtension + parsedMediaFileName.ext.length);
	} else {
		console.log(`This file is too small for segmenting ${mediaFile} with MP4Box. Will use the whole video file instead.`);

		const command = `cp '${absoluteFilePathForMedia}' '${videoSegmentFolderForMedia}'`;
		newFileName = `${parsedMediaFileName.name}${parsedMediaFileName.ext}`;

		try {
			await exec(command);
		} catch (error) {
			console.log(error);
			throw new Error(error);
		}
	}
	*/

	const newFileRelativePath = path.join(mediaFile, newFileName);

	const videoSegmentAbsolutePath = path.join(videoSegmentFolderForMedia, newFileName);

	const {ext} = path.parse(newFileName);

	const newCommand = `ffmpeg -hide_banner -y -i '${videoSegmentAbsolutePath}' -vf "scale=640:-2" '${videoSegmentAbsolutePath}.mini${ext}'`;

	try {
		await exec(newCommand);
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}

	const actualVideoSegmentDuration = await getVideoDuration(path.join(videoSegmentFolder, newFileRelativePath));

	return {
		relativeVideoSegmentPath: newFileRelativePath,
		desiredSegmentDuration: defaultVideoSegmentDuration,
		actualVideoSegmentDuration
	};
}

export default init;
