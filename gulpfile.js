import fs from "fs";
import nodemon from "nodemon";
import gulp from "gulp";
import dartSass from "sass";
import gulpSass from "gulp-sass";
import { deleteAsync } from "del";
import tinyLR from "tiny-lr";
import vinylPaths from "vinyl-paths";
import sourcemaps from "gulp-sourcemaps";
import { rollup } from "rollup";
import rollupResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import revdel from "gulp-rev-delete-original";
import rev from "gulp-rev";
import revRewrite from "gulp-rev-rewrite";
import nunjucks from "gulp-nunjucks";
import { terser } from "rollup-plugin-terser";
import child_processModule from "child_process";
import concat from "gulp-concat";
const spawnRaw = child_processModule.spawn;
const sass = gulpSass(dartSass);
const readFileSync = fs.readFileSync;
const server = tinyLR();

let hasRegisteredSIGINTHandler = false;
let spawnedProcesses = [];

function spawn(...args) {
	const spawnedProcess = spawnRaw(...args);

	spawnedProcesses.push(spawnedProcess);

	if (!hasRegisteredSIGINTHandler) {
		process.once("SIGINT", () => {
			for (const spawnedProcess of spawnedProcesses) {
				spawnedProcess.kill();
			}
		});

		hasRegisteredSIGINTHandler = true;
	}
}

const clientDist = `dist`;

const paths = {
	dist: clientDist,
	manifest: `${clientDist}/rev-manifest.json`,
	copy: {
		input: ["src/client/*.*"],
		output: `${clientDist}`,
	},
	copyVids: {
		input: ["src/client/vid/*.mp4"],
		output: `${clientDist}/vid`,
	},
	templates: {
		input: ["src/server/views/partials/home/media-grid-primary-item.html"],
		output: "dist/js/templates.js",
	},
	scripts: {
		input: "src/client/js/*.js",
		output: `${clientDist}/js/`,
	},
	styles: {
		input: "src/client/css/*.scss",
		output: `${clientDist}/css/`,
	},
	images: {
		input: [
			"src/client/img/**/*.jpg",
			"src/client/img/**/*.png",
			"src/client/img/**/*.svg",
		],
		output: `${clientDist}/img/`,
	},
	server: "src/server/server.js",
};

const lrPort = 35729;

gulp.task("clean", () => {
	return gulp
		.src(paths.dist, {
			allowEmpty: true,
		})
		.pipe(vinylPaths(deleteAsync));
});

function triggerChange() {
	return new Promise(resolve => {
		tinyLR.changed(resolve, "");
	});
}

function sleep(ms = 1000) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function watchFiles(done) {
	gulp.watch(
		"src/client/css/**/*.scss",
		gulp.series(["clean:css", "styles", triggerChange])
	);

	gulp.watch(
		"src/client/js/**/*.js",
		gulp.series(["clean:js", "scripts", "precompile", triggerChange])
	);

	gulp.watch(
		paths.templates.input,
		gulp.series(["clean:js", "scripts", "precompile", triggerChange])
	);

	nodemon({
		script: paths.server,
		ignore: ["src/client/", "dist/", "node_modules"],
		delay: "100",
		watch: ["src/server/"],
		ext: "js,html",
		env: {
			NODE_ENV: "development",
		},
	});

	const nodemonResult = nodemon
		.on("start", () => {
			done();
		})
		.on("restart", async files => {
			// If livereload triggers to early, the nodemon server may not have finished
			await sleep(500);
			triggerChange();
		});

	// Capture ^C
	process.once("SIGINT", function () {
		nodemonResult.emit("quit");
		nodemonResult.quitEmitted = true;
	});

	nodemonResult.on("exit", () => {
		// Ignore exit event during restart
		if (nodemonResult.quitEmitted) {
			process.exit(0);
		}
	});
}

gulp.task("styles", () => {
	return gulp
		.src(paths.styles.input, {
			base: "./src/client",
		})
		.pipe(sourcemaps.init())
		.pipe(
			sass({
				outputStyle: "compressed",
			}).on("error", sass.logError)
		)
		.pipe(rev())
		.pipe(sourcemaps.write("./"))
		.pipe(gulp.dest(paths.dist))
		.pipe(
			rev.manifest(`${paths.dist}/rev-manifest.json`, {
				merge: true,
			})
		)
		.pipe(gulp.dest("."));
});

gulp.task("scripts", async () => {
	const bundle = await rollup({
		input: "src/client/js/main.js",
		plugins: [rollupResolve(), commonjs()],
	});

	await bundle.write({
		file: paths.scripts.output + "/main.js",
		format: "iife",
		name: "library",
		sourcemap: true,
	});

	await new Promise(resolve => {
		gulp.src(paths.scripts.output + "*", {
			base: paths.dist,
		})
			.pipe(rev())
			.pipe(revdel())
			.pipe(gulp.dest(paths.dist))
			.pipe(
				rev.manifest(paths.manifest, {
					merge: true,
				})
			)
			.pipe(gulp.dest("."))
			.on("end", resolve);
	});

	// const manifest = gulp.src(paths.manifest);
	const manifest = readFileSync(paths.manifest);

	function replaceJsIfMap(filename) {
		if (filename.includes(".map")) {
			return filename.replace("js/", "");
		}

		return filename;
	}

	await new Promise(resolve => {
		gulp.src(paths.scripts.output + "*.js", {
			base: paths.dist,
		})
			.pipe(
				revRewrite({
					manifest,
					modifyUnreved: replaceJsIfMap,
					modifyReved: replaceJsIfMap,
				})
			)
			.pipe(gulp.dest(paths.dist))
			.on("end", resolve);
	});
});

gulp.task("images", () => {
	return gulp
		.src(paths.images.input, {
			base: "./src/client",
		})
		.pipe(rev())
		.pipe(gulp.dest(paths.dist))
		.pipe(
			rev.manifest(paths.manifest, {
				merge: true,
			})
		)
		.pipe(gulp.dest("."));
});

gulp.task("copy", () => {
	return gulp.src(paths.copy.input).pipe(gulp.dest(paths.copy.output));
});

gulp.task("copy:vids", () => {
	return gulp
		.src(paths.copyVids.input)
		.pipe(gulp.dest(paths.copyVids.output));
});

gulp.task("clean:css", () => {
	return gulp
		.src(`${paths.dist}/css`, {
			allowEmpty: true,
		})
		.pipe(vinylPaths(deleteAsync));
});

gulp.task("clean:js", () => {
	return gulp
		.src(`${paths.dist}/js`, {
			allowEmpty: true,
		})
		.pipe(vinylPaths(deleteAsync));
});

gulp.task("lr", done => {
	server.listen(lrPort, error => {
		if (error) {
			console.error(error);
			throw new Error("Error with the Live Reload Task ", error);
		} else {
			console.log("Live Reload server started at ", lrPort);
			done();
		}
	});
});

gulp.task("precompile", () => {
	return (
		gulp
			.src(paths.templates.input)
			.pipe(nunjucks.precompile())
			.pipe(concat("js/templates.js"))
			.pipe(rev())
			// .pipe(gulp.dest(paths.scripts.output))
			.pipe(gulp.dest("./dist"))
			.pipe(
				rev.manifest(`${paths.dist}/rev-manifest.json`, {
					merge: true,
				})
			)
			.pipe(gulp.dest("."))
	);
});

gulp.task("watch", gulp.parallel([watchFiles]));

gulp.task(
	"default",
	gulp.series([
		"clean",
		"styles",
		"scripts",
		"images",
		"copy",
		"copy:vids",
		"precompile",
		"lr",
		"watch",
	])
);

gulp.task(
	"build",
	gulp.series([
		"clean",
		"styles",
		"scripts",
		"images",
		"copy",
		"copy:vids",
		"precompile",
	])
);
