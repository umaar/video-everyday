import { promisify } from "util";
import { writeFileSync } from "fs";
import { exec as execOld } from "child_process";
import path from "path";
import dotenv from "dotenv";
import express from "express";
import config from "config";
import { rimrafSync } from "rimraf";
import moment from "moment";

import { stringifySync } from "subtitle";

import mediaMetadataQueries from "../db/queries/media-metadata-queries.js";
import playlistsQueries from "../db/queries/playlists-queries.js";
import choicesQueries from "../db/queries/choices-queries.js";
import exclusionsQueries from "../db/queries/exclusions-queries.js";
import { getMediaType } from "../lib/is-valid-media-type.js";

dotenv.config();
const exec = promisify(execOld);
const router = express.Router(); // eslint-disable-line new-cap

const webServerMediaPath = config.get("web-server-media-path");

router.get("/", async (request, response) => {
	response.redirect("/playlists");
});

router.get("/playlists", async (request, response) => {
	const playlists = await playlistsQueries.getAllPlaylists();

	const renderObject = {
		playlists,
		messages: request.flash("messages"),
	};

	response.render("playlists", renderObject);
});

router.post("/playlists", async (request, response) => {
	const newPlaylistName = request.body["playlist-name"];

	if (!newPlaylistName) {
		throw new Error("No playlist name provided!");
	}

	try {
		await playlistsQueries.insert(newPlaylistName);

		request.flash("messages", {
			status: "success",
			value: "Playlist created",
		});
	} catch (error) {
		console.log(error);

		request.flash("messages", {
			status: "danger",
			value: "Creating that playlist failed",
		});
	}

	response.redirect("/playlists");
});

router.post("/playlists/:slug", async (request, response) => {
	const newPlaylistName = request.body["playlist-name"];
	const startDate = moment(request.body["start-date"]);
	const endDate = moment(request.body["end-date"]);
	const oldSlug = request.params.slug;

	if (!newPlaylistName) {
		throw new Error("No playlist name provided!");
	}

	if (startDate.isValid() && endDate.isValid()) {
		if (endDate.isSameOrBefore(startDate)) {
			request.flash("messages", {
				status: "danger",
				value: "The end date cannot be the same or before the start date!",
			});

			return response.redirect("/playlists");
		}
	}

	const newStartDate = startDate.isValid()
		? startDate.startOf("day").toDate()
		: undefined;
	const newEndDate = endDate.isValid()
		? endDate.endOf("day").toDate()
		: undefined;

	try {
		await playlistsQueries.update({
			newPlaylistName,
			newStartDate,
			newEndDate,
			oldSlug,
		});

		request.flash("messages", {
			status: "success",
			value: "Playlist updated",
		});
	} catch (error) {
		console.log(error);

		request.flash("messages", {
			status: "danger",
			value: "Could not update the playlist",
		});
	}

	return response.redirect("/playlists");
});

async function handleConsolidate({ response, playlistsSlug }) {
	// Still need to apply sorting before copying media over
	const videoSegmentFolder = config.get("video-segment-folder");
	const consolidatedMediaFolder = config.get("consolidated-media-folder");

	// Naive check that this folder value is legit!
	if (!consolidatedMediaFolder || consolidatedMediaFolder.length < 10) {
		throw new Error(
			`The consolidated-media-folder (${consolidatedMediaFolder}) appears to be invalid`
		);
	}

	console.time("Consolidate Media");
	const dateBucketsSelected =
		await getCompletePopulatedDateBuckets(playlistsSlug);

	const selectedMediaItemsRaw = Array.from(dateBucketsSelected)
		.filter(([, { excluded }]) => !excluded)
		.map(([, { selectedMediaItem }]) => selectedMediaItem.filename);

	const allMedia = await mediaMetadataQueries.getAllMedia();

	const selectedMediaItems = selectedMediaItemsRaw
		.map(selectedMediaItem => {
			const foundMediaItem = allMedia.find(item => {
				return item.relativeFilePath === selectedMediaItem;
			});

			if (foundMediaItem) {
				return {
					segment: foundMediaItem.defaultVideoSegment,
					duration: Math.round(
						foundMediaItem.actualVideoSegmentDuration * 1000
					),
					mediaDate: new Date(foundMediaItem.mediaTakenAt),
				};
			}

			return undefined;
		})
		.filter(Boolean);

	if (selectedMediaItems.length === 0) {
		throw new Error("Handle this. No selected media items found");
	}

	rimrafSync(`${consolidatedMediaFolder}/*`);

	const subtitleData = [];
	let ongoingDuration = 0;
	const listOfFinalSegmentsForFFMPEG = [];

	for (const [
		index,
		{ segment, duration, mediaDate },
	] of selectedMediaItems.entries()) {
		const mediaItemPath = path.join(videoSegmentFolder, segment);
		const targetExtension = ".mp4";
		// Const extension = path.parse(mediaItemPath).ext;
		// const newFileName = (index + 1).toString().padStart(4, '0') + extension;
		// const targetExtension = `.mkv`;
		const newFileName =
			(index + 1).toString().padStart(4, "0") + targetExtension;
		// Const terminalCommand = `cp '${mediaItemPath}' '${path.join(consolidatedMediaFolder, newFileName)}'`;

		const fullOutputPath = path.join(consolidatedMediaFolder, newFileName);

		const terminalCommand = `ffmpeg -hide_banner -i '${mediaItemPath}' -filter:v "scale=iw*min(1920/iw\\,1080/ih):ih*min(1920/iw\\,1080/ih), pad=1920:1080:(1920-iw*min(1920/iw\\,1080/ih))/2:(1080-ih*min(1920/iw\\,1080/ih))/2" -c:a copy '${fullOutputPath}'`;

		// Ffmpeg  -i 0091.mp4 -filter:v "scale=iw*min(1920/iw\,1080/ih):ih*min(1920/iw\,1080/ih), pad=1920:1080:(1920-iw*min(1920/iw\,1080/ih))/2:(1080-ih*min(1920/iw\,1080/ih))/2" -c:a copy scaled/0091.mkv

		console.log("Scaling:\n", terminalCommand);

		try {
			await exec(terminalCommand); // eslint-disable-line no-await-in-loop
		} catch (error) {
			console.log(error);
			throw new Error(error);
		}

		const birthDate = new Date(config.get("birth-date"));

		let differenceString = "";

		// Need to validate `birthDate` is a valid date
		const b = moment(birthDate);
		const a = moment(mediaDate);

		const years = a.diff(b, "year");
		b.add(years, "years");

		const months = a.diff(b, "months");
		b.add(months, "months");

		const days = a.diff(b, "days");

		if (years !== 0) {
			differenceString += `${years} years `;
		}

		differenceString += `${months} months`;

		if (days > 0) {
			differenceString += ` ${days} day${days > 1 ? "s" : ""}`;
		}

		subtitleData.push({
			data: {
				start: ongoingDuration,
				end: ongoingDuration + duration,
				text: differenceString,
			},
			type: "cue",
		});

		ongoingDuration += duration;

		console.log("Subtitles");

		const listOfTextInSubtitle = [];
		listOfTextInSubtitle.push({
			data: {
				start: 0,
				end: 10000,
				text: differenceString,
			},
			type: "cue",
		});

		const subtitles = stringifySync(listOfTextInSubtitle, {
			format: "SRT",
		});

		const fullPathToSubtitleFile = path.join(
			consolidatedMediaFolder,
			`${newFileName}.srt`
		);
		writeFileSync(fullPathToSubtitleFile, subtitles);

		const subtitledFileName = newFileName.replace(
			targetExtension,
			"-subtitled" + targetExtension
		);
		const subtitleTerminalCommand = `ffmpeg -i '${fullOutputPath}'  -filter:v subtitles='${fullPathToSubtitleFile}' '${path.join(
			consolidatedMediaFolder,
			subtitledFileName
		)}'`;

		console.log("Burn in subtitle:\n", subtitleTerminalCommand);

		try {
			await exec(subtitleTerminalCommand); // eslint-disable-line no-await-in-loop
		} catch (error) {
			console.log(error);
			throw new Error(error);
		}
	}

	const subtitles = stringifySync(subtitleData, { format: "SRT" });
	writeFileSync(
		path.join(consolidatedMediaFolder, "subtitles.srt"),
		subtitles
	);

	listOfFinalSegmentsForFFMPEG.map(fileName =>
		console.log(`file '${fileName}'`)
	);

	console.timeEnd("Consolidate Media");

	response.json({
		ok: true,
	});
}

async function getCompletePopulatedDateBuckets(playlistSlug) {
	const allMediaRaw = await mediaMetadataQueries.getAllMedia();
	const playlist = await playlistsQueries.getPlaylistBySlug(playlistSlug);
	const playlistStartDate = playlist.startDate || -Infinity;
	const playlistEndDate = playlist.endDate || Infinity;

	const json = allMediaRaw
		.sort((a, b) => {
			const nameA = a.mediaTakenAt;
			const nameB = b.mediaTakenAt;

			if (nameA < nameB) {
				return -1;
			}

			if (nameA > nameB) {
				return 1;
			}

			return 0;
		})
		.filter(({ mediaTakenAt }) => {
			return (
				mediaTakenAt >= playlistStartDate &&
				mediaTakenAt <= playlistEndDate
			);
		})
		.map(item => {
			const isVideo = getMediaType(item.relativeFilePath) === "video";
			const createdDate = new Date(item.mediaTakenAt);
			const videoDuration = Math.round(item.videoDuration);
			let miniVideoSegment;

			if (isVideo) {
				const preferredVideoSegment = item.userSelectedVideoSegment
					? item.userSelectedVideoSegment
					: item.defaultVideoSegment;
				const videoSegment = path.join(
					webServerMediaPath,
					"segments",
					preferredVideoSegment
				);

				miniVideoSegment = `${videoSegment}.mini${
					path.parse(item.relativeFilePath).ext
				}`;
			}

			return {
				url: path.join(webServerMediaPath, item.relativeFilePath),
				filename: item.relativeFilePath,
				created: createdDate,
				formattedDate: createdDate.toDateString(),
				mediaSource: item.mediaSource,
				isVideo,
				videoDuration: `${Math.floor(videoDuration / 60)}:${
					videoDuration % 60
				}`,
				miniVideoSegment,
				id: item.id,
			};
		});

	const dateBuckets = json.reduce((previous, current) => {
		// eslint-disable-line unicorn/no-array-reduce
		const currentDateBucket = current.formattedDate;
		const existingBucketContents = previous.get(currentDateBucket) || [];

		existingBucketContents.push(current);

		const sortedBucketContents = existingBucketContents.sort(a =>
			a.isVideo ? -1 : 0
		);
		previous.set(currentDateBucket, sortedBucketContents);

		return previous;
	}, new Map());

	const allChoices = (
		await choicesQueries.getChoicesByPlaylistSlug(playlistSlug)
	).map(item => {
		const formattedDate = new Date(item.mediaTakenAt).toDateString();
		return {
			...item,
			formattedDate,
		};
	});

	const exclusions =
		await exclusionsQueries.getExclusionsByPlaylistsSlug(playlistSlug);

	const dateBucketsSelected = [...dateBuckets].reduce((previous, current) => {
		// eslint-disable-line unicorn/no-array-reduce
		const [dateTitle, items] = current;

		const isCurrentDateExcluded = exclusions.has(dateTitle);

		const matchingChoice = allChoices.find(
			({ formattedDate }) => dateTitle === formattedDate
		);
		let matchingItemIndex = 0;

		if (matchingChoice) {
			matchingItemIndex = items.findIndex(
				({ id }) => id === matchingChoice.mediaMetadataID
			);
		}

		if (!isCurrentDateExcluded) {
			items[matchingItemIndex].isSelected = true;
		}

		const value = {
			selectedMediaItem: items[matchingItemIndex],
			items,
			excluded: isCurrentDateExcluded,
		};

		previous.set(dateTitle, value);
		return previous;
	}, new Map());

	return dateBucketsSelected;
}

router.get("/playlist/:slug", async (request, response) => {
	const playlistSlug = request.params.slug;

	const currentPlaylist =
		await playlistsQueries.getPlaylistBySlug(playlistSlug);

	if (!currentPlaylist) {
		request.flash("messages", {
			status: "danger",
			value: "That playlist does not exist",
		});

		return response.redirect("/playlists");
	}

	function constructPageUrl(page = 1) {
		return `/playlist/${playlistSlug}?page=${page}`;
	}

	const page = Number.parseInt(request.query.page, 10);

	if (page < 1 || Number.isNaN(page)) {
		const firstPage = constructPageUrl(1);
		return response.redirect(firstPage);
	}

	const dateBucketsSelected =
		await getCompletePopulatedDateBuckets(playlistSlug);

	const itemsPerPage = 8;
	const offset = (page - 1) * itemsPerPage;
	const paginatedDateBucketsSelected = new Map(
		[...dateBucketsSelected].slice(offset, offset + itemsPerPage)
	);
	const totalPages = Math.ceil(dateBucketsSelected.size / itemsPerPage);

	const renderObject = {
		messages: request.flash("messages"),
		dateBuckets: paginatedDateBucketsSelected,
		currentPageNumber: page,
		totalPages,
		previousPage: page > 1 ? constructPageUrl(page - 1) : undefined,
		nextPage: page < totalPages ? constructPageUrl(page + 1) : undefined,
	};

	response.render("index", renderObject);
});

router.post("/playlist/:slug", async (request, response) => {
	const playlistsSlug = request.params.slug;

	if (!playlistsSlug) {
		throw new Error("No playlist slug provided!");
	}

	const shouldConsolidateMedia = request.query.consolidate;

	if (shouldConsolidateMedia) {
		return handleConsolidate({
			request,
			response,
			playlistsSlug,
		});
	}

	const id = request.body.id;

	if (id) {
		await choicesQueries.insertChoice({
			mediaMetadataID: id,
			playlistsSlug,
		});
	} else {
		const formattedDate = request.body.formattedDate;
		const shouldRemove = request.body.remove;

		if (shouldRemove) {
			await exclusionsQueries.remove({
				playlistsSlug,
				formattedDate,
			});
		} else {
			await exclusionsQueries.insert({
				playlistsSlug,
				formattedDate,
			});
		}
	}

	response.json({
		ok: true,
	});
});

export default router;
