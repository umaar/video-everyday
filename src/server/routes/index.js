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

	console.time('Consolidate Media');
	const selectedMediaItemsRaw = request.body;
	const allMedia = (await mediaMetadataQueries.getAllMedia());

	const selectedMediaItems = selectedMediaItemsRaw.map(selectedMediaItem => {
		const {defaultVideoSegment} = allMedia.find(item => {
			return item.relativeFilePath === selectedMediaItem;
		});

		return defaultVideoSegment;
	}).filter(Boolean);

	if (selectedMediaItems.length === 0) {
		throw new Error('Handle this. No selected media items found');
	}

	rimraf.sync(`${consolidatedMediaFolder}/*`);

	for (const [index, currentMediaItem] of selectedMediaItems.entries()) {
		const mediaItemPath = path.join(videoSegmentFolder, currentMediaItem);
		const extension = path.parse(mediaItemPath).ext;
		const newFileName = (index + 1).toString().padStart(4, '0') + extension;
		const terminalCommand = `cp '${mediaItemPath}' '${path.join(consolidatedMediaFolder, newFileName)}'`;
		console.log(terminalCommand);
		const {stderr} = await exec(terminalCommand); // eslint-disable-line no-await-in-loop
		if (stderr) {
			console.log('stderr', stderr);
		}
	}

	console.timeEnd('Consolidate Media');

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
