
const fs = require("fs");
const path = require("path");
const config = require('config');
const ffmpeg = require("fluent-ffmpeg");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const mediaMetadataQueries = require('../db/queries/media-metadata-queries');
const scanFiles = require('./scan-files');
const {getMediaType} = require('./is-valid-media-type');

const thumbnailsDesiredAmount = config.get('thumbnails-amount');
const startPositionPercent = 5;
const endPositionPercent = 95;
const addPercent = (endPositionPercent - startPositionPercent) / (thumbnailsDesiredAmount - 1);

const mediaFolder = config.get('media-folder')
const thumbnailsFolder = config.get('thumbnails-folder');

function generateThumbnails({
	absoluteFilePathForMedia,
	thumbnailFolderForMedia
}) {
	return new Promise((resolve, reject) => {
		let currentScreenshotIndex = 0;

		const timestamps = [];
	    let index = 0;
	    while (index < thumbnailsDesiredAmount) {
	        timestamps.push(`${startPositionPercent + addPercent * index}%`);
	        index = index+ 1;
	    }

	    function takeScreenshots(file) {
	    	ffmpeg(absoluteFilePathForMedia)
	    	    .on("start", () => {
	    	        if (currentScreenshotIndex < 1) {
	    	            console.log(`About to take screenshots for ${file}`);
	    	        }
	    	    })
	    	    .on("end", () => {
	    	        currentScreenshotIndex = currentScreenshotIndex + 1;

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

	    takeScreenshots(absoluteFilePathForMedia)
	})
}

async function init() {
	const existingThumbnails = await scanFiles(thumbnailsFolder);
	const rawMediaInDB = await mediaMetadataQueries.getAllMedia();

	const videoFilesInDB = rawMediaInDB.filter(({relativeFilePath}) => {
		return getMediaType(relativeFilePath) === 'video'
	}).map(({relativeFilePath}) => {
		return {
			absoluteFilePathForMedia: path.join(mediaFolder, relativeFilePath),
			thumbnailFolderForMedia: path.join(thumbnailsFolder, relativeFilePath)
		}
	});

	const videoThumbnailsWhichNeedGenerating = videoFilesInDB.filter(({
		thumbnailFolderForMedia
	}) => {
			const hasEveryThumbnail = Array.from({ length: thumbnailsDesiredAmount }, (v, i) => i + 1).every(currentIndex => {
				return existingThumbnails.includes(path.join(
					thumbnailFolderForMedia,
					`${currentIndex}.jpg`
				))
			});

			const hasTooManyThumbnails = existingThumbnails.includes(path.join(
				thumbnailFolderForMedia,
				`${thumbnailsDesiredAmount + 1}.jpg`
			))

			return !hasEveryThumbnail || hasTooManyThumbnails
		})

	if (videoThumbnailsWhichNeedGenerating.length) {
		console.log(`${videoThumbnailsWhichNeedGenerating.length} videos needs thumbnail processing`);
	} else {
		console.log(`No video thumbails need generating`);
	}

	for (let {absoluteFilePathForMedia, thumbnailFolderForMedia} of videoThumbnailsWhichNeedGenerating) {
		if (fs.existsSync(thumbnailFolderForMedia)) {
			console.log(`Deleting ${thumbnailFolderForMedia} as it needs processing again`);
			rimraf.sync(thumbnailFolderForMedia);
		}

		mkdirp.sync(thumbnailFolderForMedia);

		await generateThumbnails({
			absoluteFilePathForMedia,
			thumbnailFolderForMedia
		});
	}

}

module.exports = init;
