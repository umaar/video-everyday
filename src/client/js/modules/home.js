/* global window */

const {
	nunjucks,
	document,
	fetch,
	everyDayVideoConfig,
	tippy
} = window;

function registerVideoEvents(video) {
	if (!video || !HTMLVideoElement.prototype.isPrototypeOf(video)) {
		throw new Error('Have not received a valid video', video)
	}

	video.addEventListener('mouseenter', () => {
		video.controls = true;
		video.muted = false;
	});

	video.addEventListener('mouseleave', () => {
		video.controls = false;
		video.muted = true;
	});
}

function replacePrimaryItem(target) {
	const primaryItemTemplate = 'media-grid-primary-item.html';
	const renderedTemplate = nunjucks.render(primaryItemTemplate, {
		mediaItem: {
			isVideo: target.dataset.isVideo === 'true',
			miniVideoSegment: target.dataset.miniVideoSegment,
			formattedDate: target.dataset.formattedDate,
			url: target.dataset.url
		}
	});

	target.closest('.media-grid__list-item').querySelector('.media-grid__primary-item').outerHTML = renderedTemplate;

	target.closest('.media-grid__alternatives').querySelector('.media-grid__alternatives-list-item--active').classList.toggle('media-grid__alternatives-list-item--active');

	target.parentElement.classList.toggle('media-grid__alternatives-list-item--active');

	const video = target.closest('.media-grid__list-item').querySelector('video');

	if (video) {
		registerVideoEvents(video);
	}
}

function handleConsolidateMedia() {
	document.querySelector('.consolidate-media').addEventListener('click', async (event) => {
		event.target.disabled = true;
		const activeMediaItems = [...document.querySelectorAll('.media-grid__alternatives-list-item--active p')].map(activeMedia => {
			return activeMedia.dataset.name;
		});

		const body = JSON.stringify(activeMediaItems);

		const response = await fetch('/consolidate-media', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body
		});

		if (response.ok) {
			// Enable the button again
			event.target.disabled = false;
		}
	});
}

async function init() {
	console.log('Home!');

	handleConsolidateMedia();

	// On  hover, unmute vid
	for (const video of [...document.querySelectorAll('.media-grid__primary-item video')]) {
		registerVideoEvents(video);
	}

	const alternativeListItemSelector = '.media-grid__alternatives-list-item p';
	[...document.querySelectorAll(alternativeListItemSelector)].forEach(elm => {
		elm.addEventListener('click', ({target}) => {
			replacePrimaryItem(target);
		});
	});

	// Hover thumbnail feature
	const {thumbnailsAmount} = everyDayVideoConfig;
	const alternativeVideoItemSelector = '.media-grid__alternatives-list-item [data-is-video="true"]';
	const items = [...document.querySelectorAll(alternativeVideoItemSelector)];
	items.forEach(elm => {
		let interval;
		let imageIndex = 0;
		const defaultIntervalTime = 80;

		tippy(elm, {content: `
			<img src="/media/thumbnails/${elm.dataset.name}/${imageIndex + 1}.jpg" alt="" />
		`,
		onShown(instance) {
			function playImages(intervalTime = defaultIntervalTime) {
				interval = setTimeout(() => {
					let slowIntervalTime;

					const img = instance.popperChildren.content.querySelector('img');
					const imgSource = img.src;
					img.src = imgSource.replace(/\d+\.jpg/, `${++imageIndex}.jpg`);

					if (imageIndex === thumbnailsAmount) {
						slowIntervalTime = 1000;
						imageIndex = 0;
					}

					return playImages(slowIntervalTime);
				}, intervalTime);
			}

			playImages();
		},

		onHidden() {
			if (interval) {
				clearInterval(interval);
			}
		}
		});
	});
}

export default {init};
