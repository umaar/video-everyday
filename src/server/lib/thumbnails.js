
import fs from 'fs';
import path from 'path';
import config from 'config';
import ffmpeg from 'fluent-ffmpeg';
import rimraf from 'rimraf';

import mediaMetadataQueries from '../db/queries/media-metadata-queries.js';
import scanFiles from './scan-files.js';
import {getMediaType} from './is-valid-media-type.js';

const thumbnailsDesiredAmount = config.get('thumbnails-amount');
const startPositionPercent = 5;
const endPositionPercent = 95;
const addPercent = (endPositionPercent - startPositionPercent) / (thumbnailsDesiredAmount - 1);

const mediaFolder = config.get('media-folder');
const thumbnailsFolder = config.get('thumbnails-folder');

function generateThumbnails({
	absoluteFilePathForMedia,
	thumbnailFolderForMedia
}) {
	return new Promise(resolve => {
		let currentScreenshotIndex = 0;

		const timestamps = [];
		let index = 0;
		while (index < thumbnailsDesiredAmount) {
			timestamps.push(`${startPositionPercent + (addPercent * index)}%`);
			index += 1;
		}

		function takeScreenshots(file) {
			ffmpeg(absoluteFilePathForMedia)
				.on('start', () => {
					if (currentScreenshotIndex < 1) {
						console.log(`About to take screenshots for ${file}`);
					}
				})
				.on('end', () => {
					currentScreenshotIndex += 1;

					if (currentScreenshotIndex < thumbnailsDesiredAmount) {
						takeScreenshots(file);
					} else {
						console.log(`Screenshot ${file}: ${currentScreenshotIndex}/${thumbnailsDesiredAmount} taken`);
						resolve();
					}
				})
				.screenshots({
					count: 1,
					timemarks: [timestamps[currentScreenshotIndex]],
					filename: `${currentScreenshotIndex + 1}.jpg`,
					size: '300x?'
				}, thumbnailFolderForMedia);
		}

		takeScreenshots(absoluteFilePathForMedia);
	});
}

async function init() {
	const existingThumbnails = await scanFiles(thumbnailsFolder);
	const rawMediaInDB = await mediaMetadataQueries.getAllMedia();

	const videoFilesInDB = rawMediaInDB.filter(({relativeFilePath}) => {
		return getMediaType(relativeFilePath) === 'video';
	}).map(({relativeFilePath}) => {
		return {
			absoluteFilePathForMedia: path.join(mediaFolder, relativeFilePath),
			thumbnailFolderForMedia: path.join(thumbnailsFolder, relativeFilePath)
		};
	});

	const videoThumbnailsWhichNeedGenerating = videoFilesInDB.filter(({
		thumbnailFolderForMedia
	}) => {
		const hasEveryThumbnail = Array.from({length: thumbnailsDesiredAmount}, (v, index) => index + 1).every(currentIndex => {
			return existingThumbnails.includes(path.join(
				thumbnailFolderForMedia,
				`${currentIndex}.jpg`
			));
		});

		const hasTooManyThumbnails = existingThumbnails.includes(path.join(
			thumbnailFolderForMedia,
			`${thumbnailsDesiredAmount + 1}.jpg`
		));

		return !hasEveryThumbnail || hasTooManyThumbnails;
	});

	if (videoThumbnailsWhichNeedGenerating.length > 0) {
		console.log(`${videoThumbnailsWhichNeedGenerating.length} videos needs thumbnail processing`);
	} else {
		console.log('No video thumbails need generating');
	}

	let currentIteration = 0;

	for (const item of videoThumbnailsWhichNeedGenerating) {
		currentIteration++;
		const consoleGroupTitle = `Thumbnail Creation (${currentIteration}/${videoThumbnailsWhichNeedGenerating.length})`;
		console.group(consoleGroupTitle);

		const {absoluteFilePathForMedia, thumbnailFolderForMedia} = item;

		if (fs.existsSync(thumbnailFolderForMedia)) {
			if (thumbnailFolderForMedia.length < 20) {
				// Naive check for now
				throw new Error('Will not delete: ', thumbnailFolderForMedia);
			}

			console.log(`Deleting ${thumbnailFolderForMedia} as it needs processing again`);
			rimraf.sync(thumbnailFolderForMedia);
		}

		fs.mkdirSync(thumbnailFolderForMedia, {
			recursive: true
		});

		await generateThumbnails({ // eslint-disable-line no-await-in-loop
			absoluteFilePathForMedia,
			thumbnailFolderForMedia
		});

		console.groupEnd(consoleGroupTitle)
	}
}

export default init;
