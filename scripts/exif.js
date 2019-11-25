const sharp = require('sharp');
const exifReader = require('exif-reader');

sharp('pic.jpg')
	.metadata()
	.then(({exif}) => {
		const exifProperties = exifReader(exif);
		console.log(exifProperties);
		console.log(exifProperties.exif.DateTimeOriginal);
	});
