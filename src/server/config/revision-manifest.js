import path from 'path';
import fs from 'fs';

let manifest = {};

function getManifestFile() {
	const manifestPath = path.resolve(process.cwd(), 'dist/rev-manifest.json');
	const rawManifest = fs.readFileSync(manifestPath);
	return JSON.parse(rawManifest);
}

function revisionManifest() {
	return function (_, response, next) {
		try {
			manifest = getManifestFile();
		} catch (error) {
			console.log('Error getting revision manifest:', error);
			manifest = {};
		}

		response.locals.rev = function (path) {
			return '/' + (manifest[path] || path);
		};

		next();
	};
}

export default revisionManifest;
