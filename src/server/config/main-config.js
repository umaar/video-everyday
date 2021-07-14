import path from 'path';
import cookieParser from 'cookie-parser';
import forceDomainModule from 'forcedomain';
import bodyParser from 'body-parser';
import moment from 'moment';
import session from 'express-session';
import flash from 'connect-flash';
import nunjucks from 'nunjucks';
import passport from 'passport';
import config from 'config';
import compression from 'compression';
import connectSessesionKnex from 'connect-session-knex';
import knex from '../db/connection.js';
import revisionManifest from './revision-manifest.js';

const KnexSessionStore = connectSessesionKnex(session);
const store = new KnexSessionStore({knex});

// Load environment variables
function init(app, express) {
	app.disable('x-powered-by');

	const viewFolders = [
		path.join(process.cwd(), 'src', 'server', 'views')
	];

	const nunjucksEnvironment = nunjucks.configure(viewFolders, {
		express: app,
		autoescape: true,
		noCache: true
	});

	nunjucksEnvironment.addFilter('formatForHTMLDateInput', string => {
		return moment(string).format('YYYY-MM-DD');
	});

	app.locals.config = {
		productName: config.get('productName'),
		thumbnailsAmount: config.get('thumbnails-amount')
	};

	app.set('view engine', 'html');

	// *** Middlewares *** //
	app.use(compression());

	app.use(forceDomainModule.forceDomain({
		hostname: config.get('hostname'),
		protocol: 'https'
	}));

	app.use(revisionManifest());

	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: false
	}));

	app.use(session({
		name: '__sid__',
		secret: config.get('cookieSecret'),
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: 'lax'
		},
		store
	}));

	app.use(passport.initialize());
	app.use(passport.session());
	app.use(flash());

	app.use(express.static('dist', {
		maxAge: '1y'
	}));

	const mediaFolder = config.get('media-folder');
	const webServerMediaPath = config.get('web-server-media-path');
	app.use(webServerMediaPath, express.static(mediaFolder));

	const thumbnailsFolder = config.get('thumbnails-folder');
	app.use(path.join(webServerMediaPath, 'thumbnails'), express.static(thumbnailsFolder));

	// Wip
	const videoSegmentFolder = config.get('video-segment-folder');
	app.use(path.join(webServerMediaPath, 'segments'), express.static(videoSegmentFolder));
}

export default init;
