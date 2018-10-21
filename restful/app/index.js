// Primary file for API

//dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

//declare the app
var app = {};

app.init=function(){
	//start the server and workers
	server.init();
	workers.init();
};

app.init();

module.exports = app;