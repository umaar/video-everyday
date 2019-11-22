
import { promisify } from 'util';
import {exec as execOld} from 'child_process';

import fs from "fs";
import path from "path";
import config from 'config';
import mkdirp from "mkdirp";

const exec = promisify(execOld);
const videoSegmentFolder = config.get('video-segment-folder');
const defaultVideoSegmentDuration = config.get('video-segment-duration-seconds');
const mediaFolder = config.get('media-folder')

async function init({mediaFile, totalVideoDuration}) {
	const absoluteFilePathForMedia = path.join(mediaFolder, mediaFile);
	const videoSegmentFolderForMedia = path.join(videoSegmentFolder, mediaFile)
	const parsedMediaFileName = path.parse(mediaFile);

	mkdirp.sync(videoSegmentFolderForMedia);
	let newFileName;

	// 5 is a minimum padding, in seconds which the video should have for MP4Box to do a split
	if ((defaultVideoSegmentDuration + 7) < totalVideoDuration) {
		const MP4BoxBinary = `/Applications/GPAC.app/Contents/MacOS/MP4Box`;
		const halfWayMark = Math.floor(totalVideoDuration / 2);
		const command = `(cd '${videoSegmentFolderForMedia}' && ${MP4BoxBinary} -splitx ${halfWayMark}:${halfWayMark + defaultVideoSegmentDuration} '${absoluteFilePathForMedia}')`

		const {stderr} = await exec(command)

		const indexOfFileName = stderr.indexOf( parsedMediaFileName.name );
		const indexOfFileExtension = stderr.indexOf( `${parsedMediaFileName.ext} - duration` );

		newFileName = stderr.substring(indexOfFileName, indexOfFileExtension + parsedMediaFileName.ext.length)
	} else {
		console.log(`This file is too small for segmenting ${mediaFile} with MP4Box. Will use the whole video file instead.`);

		const command = `cp '${absoluteFilePathForMedia}' '${videoSegmentFolderForMedia}'`;
		newFileName = `${parsedMediaFileName.name}${parsedMediaFileName.ext}`
		const {stderr} = await exec(command)
	}

	const newFileRelativePath = path.join(mediaFile, newFileName);

	const videoSegmentAbsolutePath = path.join(videoSegmentFolderForMedia, newFileName);

	const {ext} = path.parse(newFileName);

	const newCommand = `ffmpeg -y -i '${videoSegmentAbsolutePath}' -vf "scale=640:-2" '${videoSegmentAbsolutePath}.mini${ext}'`

	console.log('Mini video command: ', newCommand);

	const {stderr: ffmpegStderr} = await exec(newCommand)

	return {
		relativeVideoSegmentPath: newFileRelativePath,
		segmentDuration: defaultVideoSegmentDuration
	};
}

export default init;
