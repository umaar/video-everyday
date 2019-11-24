
function init(app) {
	// Catch 404 and forward to error handler
	app.use((request, response) => {
		const error = new Error('Not Found');
		error.status = 404;
		response.status(error.status).render('error', {
			message: 'Not found'
		});
	});

	// Production error handler (no stacktraces leaked to user)
	app.use((error, request, response) => {
		request.flash('messages', {
			status: 'danger',
			value: 'Something went wrong.'
		});
		response.status(error.status || 500).render('error', {
			message: 'Something went wrong'
		});
	});
}

export default init;
