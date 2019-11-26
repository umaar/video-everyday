import path from 'path';
import {promises as FSPromises} from 'fs';

async function scan(directoryName) {
	const files = await FSPromises.readdir(directoryName, {
		withFileTypes: true
	});

	const result = files.map(file => {
		const fullPath = path.join(directoryName, file.name);
		return file.isDirectory() ? scan(fullPath) : fullPath;
	});

	return (await Promise.all(result)).flat();
}

export default scan;
