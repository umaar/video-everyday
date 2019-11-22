import knex from '../connection.js';

const mediaMetadataTableName = 'mediaMetadata';

async function getAllMedia() {
	return knex.select('*').from(mediaMetadataTableName);
}

async function insert(media) {
	return await knex(mediaMetadataTableName).insert(media);
}

async function deleteFileEntry(relativeFilePath) {
	return knex(mediaMetadataTableName)
		.where('relativeFilePath', relativeFilePath)
		.del();
}

export default {
	insert,
	getAllMedia,
	deleteFileEntry
}
