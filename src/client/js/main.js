
import home from './modules/home';

function init() {
	if (window.location.pathname === '/') {
		home.init();
	}
}

window.addEventListener('load', init);
