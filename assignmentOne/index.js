const http = require('http');
const url = require('url');


var httpServer = http.createServer(function(req,res){

	var parsedUrl = url.parse(req.url, true);
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g,'');

	var queryStringObject = parsedUrl.query;

	var method = req.method.toLowerCase();

	var headers = req.headers;


	var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
	
	var data = {
		'trimmedPath' : trimmedPath,
		'method' : method,
		'headers' : headers,
		'queryStringObject' : queryStringObject
	};

	chosenHandler(data, function(statusCode, payload){

		statusCode = typeof(statusCode) == 'number' ? statusCode: 200;
		payload = typeof(payload) == 'object' ? payload : {};

		payloadString = JSON.stringify(payload);
		res.setHeader('Content-Type','application/json')
		res.writeHead(statusCode);
		res.end(payloadString);
		console.log("\n Response returned is : ",statusCode,payloadString);

	});

});

httpServer.listen(3000,function(){
	console.log('listening on port :'+3000);
});

var handlers = {};

handlers.notFound = function(data, callback){
	callback(404);
}

handlers.hello = function(data, callback){
	callback(200,{'hello':'world','hey there':data.queryStringObject.name});
}

var router = {
	'hello' : handlers.hello
};
