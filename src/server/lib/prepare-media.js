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

function handleFolderChecks() {
	const foldersToConfirmExists = ['media-folder'];

	const foldersToCreate = [
		'thumbnails-folder',
		'video-segment-folder',
		'consolidated-media-folder'
	];

	for (const folderKey of [...foldersToConfirmExists, ...foldersToCreate]) {
		const folder = config.get(folderKey);
		const folderExists = fs.existsSync(folder);

		if (!folderExists) {
			if (foldersToConfirmExists.includes(folderKey)) {
				throw new Error(`${folder} (the ’${folderKey}’) does not exist. Exiting`);
			} else {
				console.log(`${folderKey} does not exist. Creating ${folder}`);
				fs.mkdirSync(folder, {
					recursive: true
				});
			}
		}
	}
}

async function init() {
	const shouldSkipMediaScanning = config.get('skip-media-scanning');

	if (shouldSkipMediaScanning) {
		console.warn('\nMedia scanning is being skipped. Use the `skip-media-scanning` config option to change this behaviour\n');
		return;
	}

	handleFolderChecks();
	const mediaFolder = config.get('media-folder');

	const allMediaInDB = await mediaMetadataQueries.getAllMedia();
	const allMediaNamesInDB = allMediaInDB.reduce((itemNames, currentItem) => { // eslint-disable-line unicorn/no-array-reduce
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

	let unprocessableMediaCount = 0;

	// Items already in the database don't need processing again
	const mediaFilesWhichNeedProcessing = candidateMediaFiles.filter(mediaFile => {
		return !allMediaNamesInDB.has(mediaFile);
	}).filter(mediaFile => {
		return getMediaType(mediaFile) === 'video';
	});

	let currentIteration = 0;

	for (const mediaFile of mediaFilesWhichNeedProcessing) {
		currentIteration++;
		let metadata;

		try {
			metadata = await getMediaMetadata(path.join(mediaFolder, mediaFile)); // eslint-disable-line no-await-in-loop
		} catch (error) {
			console.log('Error getting metadata', error);
		}

		if (!metadata) {
			unprocessableMediaCount++;
			console.log(`${mediaFile} couldn’t be processed. Skipping this item.`);
			continue;
		}

		if (Math.floor(metadata.duration) <= 1) {
			unprocessableMediaCount++;
			console.log(`${mediaFile} is too short. Skipping this item.`);
			continue;
		}

		const DBRecord = {
			relativeFilePath: mediaFile,
			mediaTakenAt: metadata.timestamp,
			mediaSource: metadata.source,
			videoDuration: metadata.duration
		};

		DBRecord.videoDuration = metadata.duration;
		const consoleGroupTitle = `Video Segment Creation (${currentIteration}/${mediaFilesWhichNeedProcessing.length})`;
		console.group(consoleGroupTitle);
		const {
			desiredSegmentDuration,
			relativeVideoSegmentPath,
			actualVideoSegmentDuration
		} = await generateVideoSegment({ // eslint-disable-line no-await-in-loop
			mediaFile,
			totalVideoDuration: DBRecord.videoDuration
		});

		console.log(`Created: ${relativeVideoSegmentPath}`);
		console.groupEnd(consoleGroupTitle)

		DBRecord.defaultVideoSegment = relativeVideoSegmentPath;
		DBRecord.defaultDesiredVideoSegmentDuration = desiredSegmentDuration;
		DBRecord.actualVideoSegmentDuration = actualVideoSegmentDuration;

		await mediaMetadataQueries.insert(DBRecord); // eslint-disable-line no-await-in-loop
	}

	console.log(`${unprocessableMediaCount} media items couldn’t be processed`);

	await generateThumbnails();
}

export default init;
