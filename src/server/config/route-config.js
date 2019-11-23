import routes from '../routes/index.js';

function init(app) {
	app.use('/', routes);
}

export default init;
