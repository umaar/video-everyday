(function (routeConfig) {
	routeConfig.init = function (app) {
		const routes = require('../routes');

		app.use('/', routes);
	};
})(module.exports);
