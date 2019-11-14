// const syncMediaToDatabase = require('./sync-media-to-database.js');
const generateThumbnails = require('./thumbnails.js');
// const generateVideosSegment = require('./generate-videos-segment.js');
const path = require('path');
const fs = require('fs');
const config = require('config');
const {isValidMediaType, getMediaType} = require('./is-valid-media-type');
const getMediaMetadata = require('./get-media-metadata');
const generateVideoSegment = require('./generate-video-segment');
const scanFiles = require('./scan-files');
const mediaMetadataQueries = require('../db/queries/media-metadata-queries');

function hasBracketsInPath(fullPath) {
	/*
		When you rotate/modify an image using Google Photos
		it appears to save a new image(5).jpg
		We don't need these, so detect and scrap them
	*/
	return fullPath.match(/\(\d*\)/);
}

function checkFoldersExist() {
	const foldersToCheck = [
		'media-folder',
		'thumbnails-folder',
		'video-segment-folder',
		'consolidated-media-folder'
	];

	for (let folderKey of foldersToCheck) {
		const folder = config.get(folderKey);
		if (!fs.existsSync(folder)) {
			throw new Error(`${folder} (the '${folderKey}') does not exist. Exiting`)
			process.exit(1);
		}
	}
}

async function init() {
	checkFoldersExist();
	const mediaFolder = config.get('media-folder');

	const allMediaInDB = await mediaMetadataQueries.getAllMedia();
	const allMediaNamesInDB = allMediaInDB.reduce((itemNames, currentItem) => {
		itemNames.add(currentItem.relativeFilePath)
		return itemNames;
	}, new Set());

	const itemsToInsert = [];

	const candidateMediaFiles = (await scanFiles(mediaFolder))
		.filter(item => isValidMediaType(item))
		.filter(item => !hasBracketsInPath(item))
		.map(item => {
			return item.replace(`${mediaFolder}/`, '');
		})

	const orphanMediaDBItems = [...allMediaNamesInDB].filter(item => {
		return !candidateMediaFiles.includes(item)
	})

	// delete DB records which don't have a corresponding media file
	for (let orphanMediaDBItem of orphanMediaDBItems) {
		console.log(`Deleting ${orphanMediaDBItem} from DB`);
		await mediaMetadataQueries.deleteFileEntry(orphanMediaDBItem);
	}

	// Items already in the database don't need processing again
	const mediaFilesWhichNeedProcessing = candidateMediaFiles.filter(item => {
		return !allMediaNamesInDB.has(item)
	});

	let unprocessableMediaCount = 0;

	for (let mediaFile of mediaFilesWhichNeedProcessing) {
		const isVideo = getMediaType(mediaFile) === 'video';
		let metadata;

		try {
			metadata = await getMediaMetadata(path.join(mediaFolder, mediaFile));
		} catch (err) {
			console.log(`Error getting metadata`, err);
		}

		if (!metadata) {
			unprocessableMediaCount++;
			console.log(`${mediaFile} couldn't be processed`);
			continue;
		}

		const DBRecord = {
			relativeFilePath: mediaFile,
			mediaTakenAt: metadata.timestamp,
			mediaSource: metadata.source,
			videoDuration: metadata.duration
		};

		if (isVideo) {
			DBRecord.videoDuration = metadata.duration

			const relativeVideoSegmentPath = await generateVideoSegment({
				mediaFile,
				totalVideoDuration: DBRecord.videoDuration
			});

			console.log(`New Video Segment: ${relativeVideoSegmentPath}`);
			DBRecord.defaultVideoSegment = relativeVideoSegmentPath;
		}

		await mediaMetadataQueries.insert(DBRecord);
	}

	console.log(`${unprocessableMediaCount} items couldn't be processed`);

	await generateThumbnails();
}

module.exports = init;