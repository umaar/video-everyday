ENV ?= development

# The default target must be at the top
.DEFAULT_GOAL := start

install:
	npm install
	echo '' > node_modules/interpret/mjs-stub.js
	echo 'Doing a weird hack to address https://github.com/knex/knex/issues/3882'

update-deps:
	ncu -u

migrate:
	NODE_ENV=$(ENV) ./node_modules/.bin/knex --esm migrate:latest --knexfile knexfile.mjs

start:
	NODE_ENV=$(ENV) ./node_modules/gulp/bin/gulp.js -f gulpfile.cjs

build-assets:
	./node_modules/gulp/bin/gulp.js -f gulpfile.cjs build

reset:
	rm -rf ~/Downloads/video-everyday/segments/*
	rm -rf ~/Downloads/video-everyday/thumbnails/*
	rm db-development-video-everyday.sqlite
	make migrate

clean-dist:
	rm -rf dist

build: clean-dist build-assets

test:
	./node_modules/.bin/xo
