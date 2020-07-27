import knex from '../connection.js';
import mediaMetadataQueries from './media-metadata-queries.js';

const choicesTableName = 'choices';

function datesAreOnSameDay(first, second) {
	return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
}

async function insertChoice({mediaMetadataID, playlistsSlug}) {
	const existingChoices = await knex(choicesTableName).select(
		`${choicesTableName}.id`,
		'mediaMetadata.mediaTakenAt'
	).join('mediaMetadata', {[
	`${choicesTableName}.mediaMetadataID`]: 'mediaMetadata.id'
	}).where({
		playlistsSlug
	});

	const selectedMediaItem = await mediaMetadataQueries.getItemByID(mediaMetadataID);

	const overlappingEntry = existingChoices.find(choice => {
		return datesAreOnSameDay(
			new Date(choice.mediaTakenAt),
			new Date(selectedMediaItem.mediaTakenAt)
		);
	});

	if (overlappingEntry) {
		await knex(choicesTableName).where({
			id: overlappingEntry.id
		}).del();
	}

	return knex(choicesTableName).insert({
		mediaMetadataID,
		playlistsSlug
	});
}

async function getChoicesByPlaylistSlug(slug) {
	return knex(choicesTableName).select(
		`${choicesTableName}.mediaMetadataID`,
		'mediaMetadata.mediaTakenAt'
	).join('mediaMetadata', {[
	`${choicesTableName}.mediaMetadataID`]: 'mediaMetadata.id'
	}).where({
		playlistsSlug: slug
	});
}

const exports = {
	insertChoice,
	getChoicesByPlaylistSlug
};

export default exports;
