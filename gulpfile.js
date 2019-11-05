const path = require('path');
const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const server = require('tiny-lr')();
const sass = require('gulp-sass');
const del = require('del');
const vinylPaths = require('vinyl-paths');
const sourcemaps = require('gulp-sourcemaps');
const rollup = require('rollup');
const rollupResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const revdel = require('gulp-rev-delete-original');
const rev = require('gulp-rev');
const {terser} = require('rollup-plugin-terser');
const nunjucks = require('gulp-nunjucks');
const concat = require('gulp-concat');

const paths = {
	copy: {
		input: [
			'src/client/*.*'
		],
		output: 'dist/'
	},
	copyVids: {
		input: [
			'src/client/vid/*.mp4'
		],
		output: 'dist/vid'
	},
	scripts: {
		input: [
			'src/client/js/**/*.js'
		],
		output: 'dist/js/'
	},
	templates: {
		input: [
			'src/server/views/partials/home/media-grid-primary-item.html'
		],
		output: 'dist/js/templates.js'
	},
	styles: {
		input: [
			'src/client/css/*.scss'
		],
		output: 'dist/css/'
	},
	images: {
		input: [
			'src/client/img/**/*.jpg',
			'src/client/img/**/*.png',
			'src/client/img/**/*.svg'
		],
		output: 'dist/img/'
	},
	server: path.join('src', 'server', 'server.js')
};

const lrPort = 35729;

const nodemonConfig = {
	script: paths.server,
	ext: 'html js css md',
	ignore: [
		'node_modules',
		'src/client'
	],
	env: {
		NODE_ENV: 'development'
	},
	execMap: {
		js: 'node'
	}
};

gulp.task('clean', () => {
	return gulp.src('dist')
		.pipe(vinylPaths(del));
});

function watchFiles() {
	gulp.watch(paths.scripts.input);
	gulp.watch('src/client/css/**/*.scss', gulp.series(['clean:css', 'styles']));
	gulp.watch([
		'src/client/js/**/*.js',
		...paths.templates.input
	], gulp.series(['clean:js', 'precompile', 'scripts']));
	// gulp.watch(paths.scripts.input, gulp.series(['scripts']));

	// gulp.watch(paths.templates.input, gulp.series(['clean:templates', 'precompile']));
}

gulp.task('styles', () => {
	return gulp.src(paths.styles.input, {base: './src/client'})
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', sass.logError))
		.pipe(sourcemaps.write('./'))
	    .pipe(gulp.dest('./dist'))
	    .pipe(gulp.dest('.'));
});

gulp.task('scripts', async () => {
	/*
		Warning: The numWorkers property in the code below stops this failing on my Linode
			- By default, rollup-plugin-terser spawns workers...
				... Defaults to the number of CPUs minus 1.
			- As a result, the bundle promise.write call would never resolve
	*/
	const bundle = await rollup.rollup({
		input: 'src/client/js/main.js',
		plugins: [
			rollupResolve(),
			commonjs(),
			// terser({
			// 	sourcemap: true,
			// 	numWorkers: 1
			// })
		]
	});

	await bundle.write({
		file: paths.scripts.output + '/main.js',
		format: 'iife',
		name: 'library',
		sourcemap: true
	});
});

gulp.task('images', () => {
	return gulp.src(paths.images.input, {base: './src/client'})
	    .pipe(gulp.dest('./dist'))
});

gulp.task('copy', () => {
	return gulp.src(paths.copy.input)
		.pipe(gulp.dest(paths.copy.output));
});

gulp.task('copy:vids', () => {
	return gulp.src(paths.copyVids.input)
		.pipe(gulp.dest(paths.copyVids.output));
});

gulp.task('clean:css', () => {
	return gulp.src('dist/css')
		.pipe(vinylPaths(del));
});

gulp.task('clean:js', () => {
	return gulp.src('dist/js')
		.pipe(vinylPaths(del));
});

gulp.task('precompile', () => {
	return gulp.src(paths.templates.input)
		.pipe(nunjucks.precompile())
		.pipe(concat('templates.js'))
		.pipe(gulp.dest(paths.scripts.output))
})

gulp.task('lr', done => {
	server.listen(lrPort, err => {
		if (err) {
			console.error(err);
			throw new Error('Error with the Live Reload Task ', err);
		} else {
			done();
		}
	});
});

gulp.task('nodemon', done => {
	console.log('NODE MON TASK');
	return nodemon({
		...nodemonConfig,
		done
	});
});

gulp.task('watch', gulp.parallel([watchFiles]))

gulp.task('default', gulp.series([
	'clean',
	'styles',
	'scripts',
	'images',
	'copy',
	'copy:vids',
	'precompile',
	'lr',
	'watch',
	'nodemon'
]));