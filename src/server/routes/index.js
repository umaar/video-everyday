require('dotenv').config();
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
const path = require('path');
const express = require('express');
const config = require('config');
const rimraf = require("rimraf");

const {app} = require('../app-instance');

const mediaMetadataQueries = require('../db/queries/media-metadata-queries');
const {getMediaType} = require('../lib/is-valid-media-type');

const router = express.Router();

const webServerMediaPath = config.get('web-server-media-path');

router.post('/consolidate-media', async (req, res) => {
	const videoSegmentFolder = config.get('video-segment-folder');
	const consolidatedMediaFolder = config.get('consolidated-media-folder');

	const selectedMediaItemsRaw = req.body;
	const allMedia = (await mediaMetadataQueries.getAllMedia());

	// TODO: HANDLE IMAGES
	const selectedMediaItems = selectedMediaItemsRaw.map(selectedMediaItem => {
		const {defaultVideoSegment} = allMedia.find(item => {
			return item.relativeFilePath === selectedMediaItem;
		})

		return defaultVideoSegment;
	}).filter(Boolean); // <-- DON'T DO THIS! This is a quick hack for images which are not yet implemented

	if (!selectedMediaItems.length) {
		throw new Error('Handle this. No selected media items found')
	}

	rimraf.sync(`${consolidatedMediaFolder}/*`);

	for (let [index, val] of selectedMediaItems.entries()) {
		const mediaItem = path.join(videoSegmentFolder, val);
		const extension = path.parse(mediaItem).ext;
		const newFileName = (index + 1).toString().padStart(4, '0') + extension;
		const terminalCommand = `cp '${mediaItem}' '${path.join(consolidatedMediaFolder, newFileName)}'`;

		console.log(terminalCommand);
		// TODO: Resize the videos earlier on in the process
		const {stderr} = await exec(terminalCommand)
		console.log(stderr);
	}

	res.json({
		ok: true
	})
})

router.get('/', async (req, res) => {
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
		const isVideo = getMediaType(item.relativeFilePath) === 'video' ? true : false;
		const createdDate = new Date(item.mediaTakenAt);
		const videoDuration = Math.round(item.videoDuration);
		let miniVideoSegment;

		if (isVideo) {
			const preferredVideoSegment = item.userSelectedVideoSegment ? item.userSelectedVideoSegment : item.defaultVideoSegment;
			const videoSegment = path.join(webServerMediaPath, 'segments', preferredVideoSegment);

			miniVideoSegment = `${videoSegment}.mini${path.parse(item.relativeFilePath).ext}`
			console.log(miniVideoSegment);
		}

		return {
			// url: `${webServerMediaPath}/${item.filename}`,
			url: path.join(webServerMediaPath, item.relativeFilePath),
			filename: item.relativeFilePath,
			// name: item.relativeFilePath,
			created: createdDate,
			formattedDate: createdDate.toDateString(),
			mediaSource: item.mediaSource,
			isVideo,
			videoDuration: `${Math.floor(videoDuration / 60)}:${videoDuration % 60}`,
			miniVideoSegment
		}
	});

	const thing = json.reduce((prev, cur, ind) => {
		const currentDateBucket = cur.formattedDate;
		const existingBucketContents = prev.get(currentDateBucket) || [];

		existingBucketContents.push(cur)

		const sortedBucketContents = existingBucketContents.sort((a, b) => {
			return a.isVideo ? -1 : 0
		})

		prev.set(currentDateBucket, sortedBucketContents)

		return prev;
	}, new Map());


	const renderObject = {
		messages: req.flash('messages'),
		dateBuckets: thing
	};

	res.render('index', renderObject);
});

module.exports = router;
