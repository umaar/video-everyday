import {promisify} from 'util';
import {exec as execOld} from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import config from 'config';
import rimraf from 'rimraf';

import mediaMetadataQueries from '../db/queries/media-metadata-queries.js';
import {getMediaType} from '../lib/is-valid-media-type.js';

dotenv.config();
const exec = promisify(execOld);
const router = express.Router(); // eslint-disable-line new-cap

const webServerMediaPath = config.get('web-server-media-path');

router.post('/consolidate-media', async (request, response) => {
	const videoSegmentFolder = config.get('video-segment-folder');
	const consolidatedMediaFolder = config.get('consolidated-media-folder');

	// Naive check that this folder value is legit!
	if (!consolidatedMediaFolder || consolidatedMediaFolder.length < 10) {
		throw new Error(`The consolidated-media-folder (${consolidatedMediaFolder}) appears to be invalid`);
	}

	console.time('Consolidate Media')
	const selectedMediaItemsRaw = request.body;
	const allMedia = (await mediaMetadataQueries.getAllMedia());

	// TODO: HANDLE IMAGES
	const selectedMediaItems = selectedMediaItemsRaw.map(selectedMediaItem => {
		const {defaultVideoSegment} = allMedia.find(item => {
			return item.relativeFilePath === selectedMediaItem;
		});

		return defaultVideoSegment;
	}).filter(Boolean); // <-- DON'T DO THIS! This is a quick hack to exclude images which are not yet implemented

	if (selectedMediaItems.length === 0) {
		throw new Error('Handle this. No selected media items found');
	}

	// todo: convert to: https://nodejs.org/api/fs.html#fs_fs_rmdirsync_path_options
	rimraf.sync(`${consolidatedMediaFolder}/*`);

	for (const [index, value] of selectedMediaItems.entries()) {
		const mediaItem = path.join(videoSegmentFolder, value);
		const extension = path.parse(mediaItem).ext;
		const newFileName = (index + 1).toString().padStart(4, '0') + extension;
		const terminalCommand = `cp '${mediaItem}' '${path.join(consolidatedMediaFolder, newFileName)}'`;

		// TODO: Resize the videos earlier on in the process
		const {stderr} = await exec(terminalCommand);
		console.log(stderr);
	}

	console.timeEnd('Consolidate Media')

	response.json({
		ok: true
	});
});

router.get('/', async (request, response) => {
	const json = (await mediaMetadataQueries.getAllMedia()).sort((a, b) => {
		const nameA = a.mediaTakenAt;
		const nameB = b.mediaTakenAt;

		if (nameA < nameB) {
			return -1;
		}

		if (nameA > nameB) {
			return 1;
		}

		return 0;
	}).map(item => {
		const isVideo = getMediaType(item.relativeFilePath) === 'video';
		const createdDate = new Date(item.mediaTakenAt);
		const videoDuration = Math.round(item.videoDuration);
		let miniVideoSegment;

		if (isVideo) {
			const preferredVideoSegment = item.userSelectedVideoSegment ? item.userSelectedVideoSegment : item.defaultVideoSegment;
			const videoSegment = path.join(webServerMediaPath, 'segments', preferredVideoSegment);

			miniVideoSegment = `${videoSegment}.mini${path.parse(item.relativeFilePath).ext}`;
		}

		return {
			// Url: `${webServerMediaPath}/${item.filename}`,
			url: path.join(webServerMediaPath, item.relativeFilePath),
			filename: item.relativeFilePath,
			// Name: item.relativeFilePath,
			created: createdDate,
			formattedDate: createdDate.toDateString(),
			mediaSource: item.mediaSource,
			isVideo,
			videoDuration: `${Math.floor(videoDuration / 60)}:${videoDuration % 60}`,
			miniVideoSegment
		};
	});

	const thing = json.reduce((previous, current) => {
		const currentDateBucket = current.formattedDate;
		const existingBucketContents = previous.get(currentDateBucket) || [];

		existingBucketContents.push(current);

		const sortedBucketContents = existingBucketContents.sort(a => a.isVideo ? -1 : 0);

		previous.set(currentDateBucket, sortedBucketContents);

		return previous;
	}, new Map());

	const renderObject = {
		messages: request.flash('messages'),
		dateBuckets: thing
	};

	response.render('index', renderObject);
});

export default router;
