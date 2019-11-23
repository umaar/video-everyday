import path from 'path';
import {promises as FSPromises} from 'fs';
// Const fsp = require('fs').promises;

async function scan(directoryName, results = []) {
	const files = await FSPromises.readdir(directoryName, {withFileTypes: true});
	for (const f of files) {
		const fullPath = path.join(directoryName, f.name);
		if (f.isDirectory()) {
			await scan(fullPath, results);
		} else {
			results.push(fullPath);
		}
	}

	return results;
}

export default scan;
