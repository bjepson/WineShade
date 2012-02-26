
var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.root;
handle["/vote"] = requestHandlers.vote;
handle["/fetch"] = requestHandlers.fetch;
handle["/dash"] = requestHandlers.dash;

server.start(router.route, handle);
