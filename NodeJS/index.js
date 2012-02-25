
var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.root;
handle["/vote"] = requestHandlers.vote;

server.start(router.route, handle);
