import SignaleModule from 'signale';

const options = {
	types: {
		info: {
			color: 'cyan',
			badge: 'ℹ️'
		}
	}
};

const custom = new SignaleModule.Signale(options);

custom.config({
	displayFilename: true,
	displayTimestamp: true,
	displayDate: true
});

// module.exports = custom;

export default custom;
