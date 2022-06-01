const http = require('http');
const log = require('./log');
const db = require("./db");

//Create webserver.
const hostName = 'localhost'; //local network access.
const port = 3000;

var server = http.createServer(function (request, response) {
	response.statusCode = 200;
	response.setHeader('Content-Type', 'text/plain');
	response.end('Webserver running');
});

server.listen(port, hostName, function () {
	console.log("Salty web server is live @ " + hostName + ":" + port, "info");
});