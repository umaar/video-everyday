import knex from '../connection.js';

const mediaMetadataTableName = 'mediaMetadata';

async function getAllMedia() {
	return knex.select('*').from(mediaMetadataTableName);
}

async function insert(media) {
	return knex(mediaMetadataTableName).insert(media);
}

async function deleteFileEntry(relativeFilePath) {
	return knex(mediaMetadataTableName)
		.where('relativeFilePath', relativeFilePath)
		.del();
}

const exports = {
	insert,
	getAllMedia,
	deleteFileEntry
};

export default exports;
