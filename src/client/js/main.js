/* global window */

import home from './modules/home.js';

function init() {
	if (window.location.pathname === '/') {
		home.init();
	}
}

window.addEventListener('load', init);
