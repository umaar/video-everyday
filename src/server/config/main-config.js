import rev from 'express-rev'
import path from 'path'
import cookieParser from 'cookie-parser'
import forceDomain from 'forcedomain'
import bodyParser from 'body-parser'
import session from 'express-session'
import flash from 'connect-flash'
import nunjucks from 'nunjucks'
import passport from 'passport'
import config from 'config'
import compression from 'compression'
import ConnectSessesionKnex from 'connect-session-knex';
import knex from '../db/connection.js';
import logger from '../logger.js';

const KnexSessionStore = ConnectSessesionKnex(session)
const store = new KnexSessionStore({knex});

const viewFolders = [
	// path.join(__dirname, '..', 'views')
	path.join(process.cwd(), 'src', 'server', 'views')
];

// Load environment variables
function init(app, express) {
	app.disable('x-powered-by');

	const nunjucksEnv = nunjucks.configure(viewFolders, {
		express: app,
		autoescape: true,
		noCache: true
	});

	app.locals.config = {
		productName: config.get('productName'),
		thumbnailsAmount: config.get('thumbnails-amount')
	};

	app.set('view engine', 'html');

	// *** Middlewares *** //
	app.use(compression())

	app.use(forceDomain({
		hostname: config.get('hostname'),
		protocol: 'https'
	}));

	app.use(rev({
		manifest: 'dist/rev-manifest.json',
		prepend: ''
	}));

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

	// wip
	const videoSegmentFolder = config.get('video-segment-folder');
	app.use(path.join(webServerMediaPath, 'segments'), express.static(videoSegmentFolder));
}

export default init