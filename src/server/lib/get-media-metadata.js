import sharp from 'sharp';
import exifReader from 'exif-reader';
import ffmpeg from 'fluent-ffmpeg';

import {getMediaType} from './is-valid-media-type.js';

async function getExif(fullPath) {
	const metadata = {};
	const {exif} = await sharp(fullPath).metadata();

	if (!exif) {
		// Some images don't appear to have any EXIF data according to `sharp`
		return;
	}

	const exifProperties = exifReader(exif);

	if (exifProperties.exif.DateTimeOriginal) {
		metadata.timestamp = exifProperties.exif.DateTimeOriginal;
		metadata.source = 'image exif';
	} else {
		/*
			In Google Takeout, for Android at least, some images
			do not have embedded exif data. Rather, alongside the
			image file is a `image1.jpg.json` file which includes
			some metadata
		*/
		// const contents = await fsp.readFile(`${fullPath}.json`);
		let androidPhotoMetadataFile;
		try {
			//  Needs https://nodejs.org/api/esm.html#esm_experimental_json_modules
			androidPhotoMetadataFile = require(`${fullPath}.json`);
		} catch {
			console.log(`Couldn’t find a matching JSON file for ${fullPath}`);
			return;
		}

		const {photoTakenTime} = androidPhotoMetadataFile;

		const dateObject = new Date(Date.parse(photoTakenTime.formatted));
		metadata.timestamp = dateObject;
		metadata.source = 'android json file';
		throw new Error('\n\nhandle this: https://nodejs.org/api/esm.html#esm_experimental_json_modules \n\n');
	}

	return metadata;
}

function getVideoMetadata(fullPath) {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(fullPath, (error, metadata) => {
			if (error) {
				console.log('Error with ffmpeg.ffprobe()', error);
				return reject(error);
			}

			if (!metadata.format || !metadata.format.tags || !metadata.format.tags.creation_time) {
				const errorMessage = `ffprobe Metadata for ${fullPath} does not include the creation time or duration`;

				console.log(errorMessage, {metadata});
				return reject(errorMessage);
			}

			resolve({
				timestamp: new Date(metadata.format.tags.creation_time),
				duration: metadata.format.duration,
				source: 'ffprobe'
			});
		});
	});
}

async function getMetadata(fullPath) {
	const mediaCategory = getMediaType(fullPath);

	if (mediaCategory === 'image') {
		return getExif(fullPath);
	}

	if (mediaCategory === 'video') {
		return getVideoMetadata(fullPath);
	}
}

export default getMetadata;
