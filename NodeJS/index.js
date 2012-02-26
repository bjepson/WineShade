var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.dash;
handle["/vote"] = requestHandlers.vote;
handle["/fetch"] = requestHandlers.fetch;
handle["/dash"] = requestHandlers.dash;
handle["/style.css"] = requestHandlers.css;

server.start(router.route, handle);
