const fsp = require('fs').promises;
const path = require('path');

async function scan(directoryName, results = []) {
	const files = await fsp.readdir(directoryName, {withFileTypes: true});
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

module.exports = scan;