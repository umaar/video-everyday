import {app, express} from './app-instance.js';

import appConfig from './config/main-config.js';
import routeConfig from './config/route-config.js';
import errorConfig from './config/error-config.js';

appConfig(app, express);
routeConfig(app);
errorConfig(app);

export default app;
