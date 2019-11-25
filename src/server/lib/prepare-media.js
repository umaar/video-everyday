// Const syncMediaToDatabase = require('./sync-media-to-database.js');
// const generateVideosSegment = require('./generate-videos-segment.js');
import path from 'path';
import fs from 'fs';
import config from 'config';

import mediaMetadataQueries from '../db/queries/media-metadata-queries.js';
import {isValidMediaType, getMediaType} from './is-valid-media-type.js';
import generateThumbnails from './thumbnails.js';
import getMediaMetadata from './get-media-metadata.js';
import generateVideoSegment from './generate-video-segment.js';
import scanFiles from './scan-files.js';

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

	for (const folderKey of foldersToCheck) {
		const folder = config.get(folderKey);
		if (!fs.existsSync(folder)) {
			throw new Error(`${folder} (the '${folderKey}') does not exist. Exiting`);
		}
	}
}

async function init() {
	checkFoldersExist();
	const mediaFolder = config.get('media-folder');

	const allMediaInDB = await mediaMetadataQueries.getAllMedia();
	const allMediaNamesInDB = allMediaInDB.reduce((itemNames, currentItem) => {
		itemNames.add(currentItem.relativeFilePath);
		return itemNames;
	}, new Set());

	const candidateMediaFiles = (await scanFiles(mediaFolder))
		.filter(item => isValidMediaType(item))
		.filter(item => !hasBracketsInPath(item))
		.map(item => {
			return item.replace(`${mediaFolder}/`, '');
		});

	const orphanMediaDBItems = [...allMediaNamesInDB].filter(item => {
		return !candidateMediaFiles.includes(item);
	});

	// Delete DB records which don't have a corresponding media file
	await Promise.all(orphanMediaDBItems.map(async orphanMediaDBItem => {
		console.log(`Deleting ${orphanMediaDBItem} from DB`);
		await mediaMetadataQueries.deleteFileEntry(orphanMediaDBItem);
	}));

	// Items already in the database don't need processing again
	const mediaFilesWhichNeedProcessing = candidateMediaFiles.filter(item => {
		return !allMediaNamesInDB.has(item);
	});

	let unprocessableMediaCount = 0;

	const mediaFilesWhichNeedProcessingPromises = mediaFilesWhichNeedProcessing.map(async mediaFile => {
		const isVideo = getMediaType(mediaFile) === 'video';
		let metadata;

		try {
			metadata = await getMediaMetadata(path.join(mediaFolder, mediaFile));
		} catch (error) {
			console.log('Error getting metadata', error);
		}

		if (!metadata) {
			unprocessableMediaCount++;
			console.log(`${mediaFile} couldn't be processed`);
			return;
		}

		const DBRecord = {
			relativeFilePath: mediaFile,
			mediaTakenAt: metadata.timestamp,
			mediaSource: metadata.source,
			videoDuration: metadata.duration
		};

		if (isVideo) {
			DBRecord.videoDuration = metadata.duration;

			const {segmentDuration, relativeVideoSegmentPath} = await generateVideoSegment({
				mediaFile,
				totalVideoDuration: DBRecord.videoDuration
			});

			console.log(`New Video Segment: ${relativeVideoSegmentPath}`);
			DBRecord.defaultVideoSegment = relativeVideoSegmentPath;
			DBRecord.defaultVideoSegmentDuration = segmentDuration;
		}

		await mediaMetadataQueries.insert(DBRecord);
	});

	console.log(`${unprocessableMediaCount} media items couldn't be processed`);
	await Promise.all(mediaFilesWhichNeedProcessingPromises);

	await generateThumbnails();
}

export default init;
