/* global window */

import home from './modules/home.js';

function init() {
	if (window.location.pathname.startsWith('/playlist/')) {
		home.init();
	}
}

window.addEventListener('load', init);
