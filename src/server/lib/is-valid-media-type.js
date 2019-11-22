
const allowedMediaTypes = {
	video: ['.mp4', '.mov'],
	image: ['.jpg', '.jpeg']
};

function isValidMediaType(mediaPath) {
	return Object.values(allowedMediaTypes).flat().some(mediaExtension => {
		return mediaPath.endsWith(mediaExtension) || mediaPath.endsWith(mediaExtension.toUpperCase());
	});
}

function getMediaType(mediaPath) {
	for (const [mediaCategory, mediaExtensions] of Object.entries(allowedMediaTypes)) {
		const found = mediaExtensions.some(mediaExtension => {
			return mediaPath.endsWith(mediaExtension) || mediaPath.endsWith(mediaExtension.toUpperCase());
		});

		if (found) {
			return mediaCategory;
		}
	}
}

export {
	isValidMediaType,
	getMediaType
}
