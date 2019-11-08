const {app, express} = require('./app-instance');

const appConfig = require('./config/main-config.js');
const routeConfig = require('./config/route-config.js');
const errorConfig = require('./config/error-config.js');

appConfig.init(app, express);
routeConfig.init(app);
errorConfig.init(app);

module.exports = app;
