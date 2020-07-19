import knex from '../connection.js';
import mediaMetadataQueries from './media-metadata-queries.js';

const choicesTableName = 'choices';

async function test() {
	return knex(choicesTableName).select(
		`${choicesTableName}.*`,
		'playlists.slug'
	)
		.join('playlists', {[
		`${choicesTableName}.playlists_slug`]: 'playlists.slug'
		});
}

function datesAreOnSameDay(first, second) {
    return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
}

async function insertChoice({mediaMetadata_id, playlists_slug}) {
	const existingChoices = await knex(choicesTableName).select(
		`${choicesTableName}.id`,
		'mediaMetadata.mediaTakenAt'
	).join('mediaMetadata', {[
       `${choicesTableName}.mediaMetadata_id`]: 'mediaMetadata.id'
    }).where({
        playlists_slug
    });

    const selectedMediaItem = await mediaMetadataQueries.getItemByID(mediaMetadata_id);

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
        mediaMetadata_id,
        playlists_slug
    });
}

async function getChoicesByPlaylistSlug(slug) {
	return knex(choicesTableName).select(
		`${choicesTableName}.mediaMetadata_id`,
		'mediaMetadata.mediaTakenAt',
	).join('mediaMetadata', {[
       `${choicesTableName}.mediaMetadata_id`]: 'mediaMetadata.id'
    }).where({
        playlists_slug: slug
    });
}

const exports = {
    insertChoice,
    getChoicesByPlaylistSlug
};

export default exports;
