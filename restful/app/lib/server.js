//server related tasks

//Dependency
const http = require('http');
const https = require('https');
const url  = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
//const _data = require('./lib/data');

//instantiate server module object
var server = {};

//server instance for http
server.httpServer = http.createServer(function(req,res){
	server.unifiedServer(req,res);
});

// server instance for https
server.httpsServerOptions={
	'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert':fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
	server.unifiedServer(req,res);
});

// Function for logic of servers common to http and https for our createserver callback
server.unifiedServer = function(req,res){


	//get the URL and parse it
	var parsedUrl = url.parse(req.url, true);

	//get the path requested
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g,'');

	//get the query string as an object
	var queryStringObject = parsedUrl.query;

	//get the method requested
	var method = req.method.toLowerCase();

	//get the users headers
	var headers = req.headers;

	//get the payload if any
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data){
		buffer += decoder.write(data);
	});

	req.on('end', function(){
		buffer += decoder.end();

		//choose the handlers from the path
		var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		//construct data object
		var data = {
			'trimmedPath' : trimmedPath,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer),
			'queryStringObject' : queryStringObject
		};

		//call the handlers (this is not payload we recieved! it is the one we send back)
		chosenHandler(data, function(statusCode, payload){

			//status code in function otherwise default
			statusCode = typeof(statusCode) == 'number' ? statusCode: 200;

			//payload of our function otherwise default
			payload = typeof(payload) == 'object' ? payload : {};

			payloadString = JSON.stringify(payload);

			//send a response here now! using the handlers!!
			//now making it only json
			res.setHeader('Content-Type','application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

			//log the payload we return
			console.log("\n Response returned is : ",data,statusCode,payloadString);

		});//here i call the put get post delete etc with the callback of the status code
	});
};



//define a request router
server.router = {
	'ping' : handlers.ping,
	'users' : handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
};

//init script
server.init = function(){

	//http server starts listening
	server.httpServer.listen(config.httpPort,function(){
		console.log('listening on port :'+config.httpPort);
	});


	//https server starts listening
	server.httpsServer.listen(config.httpsPort,function(){
		console.log('listening on port :'+config.httpsPort);
	});


}

//export the server
module.exports = server;