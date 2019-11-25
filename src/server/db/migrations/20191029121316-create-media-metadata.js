exports.up = function (knex) {
	return knex.schema.createTable('mediaMetadata', table => {
		table.increments();
		table.string('relativeFilePath').unique().notNullable();
		table.timestamp('mediaTakenAt').notNullable();
		table.string('mediaSource').notNullable();
		table.integer('videoDuration');
		table.string('defaultVideoSegment');
		table.integer('defaultVideoSegmentDuration');
		table.string('userSelectedVideoSegment');
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('mediaMetadata');
};
