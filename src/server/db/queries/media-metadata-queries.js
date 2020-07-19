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

async function getItemByID(id) {
	return knex(mediaMetadataTableName).where('id', id).first();
}

const exports = {
	insert,
	getAllMedia,
	deleteFileEntry,
	getItemByID
};

export default exports;
