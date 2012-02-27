var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.dash;
handle["/vote"] = requestHandlers.vote;
handle["/fetch"] = requestHandlers.fetch;
handle["/dash"] = requestHandlers.dash;
handle["/stationVotes"] = requestHandlers.stationVotes;
handle["/style.css"] = requestHandlers.css;
handle["/jquery.js"] = requestHandlers.jquery;

server.start(router.route, handle);
