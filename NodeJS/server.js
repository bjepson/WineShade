var http = require("http");
var url = require("url");

function start(route, handle) {

  function onRequest(request, response) {
    
    var query    = url.parse(request.url, true).query;    
    var pathname = url.parse(request.url).pathname;
    console.log("Request for " + pathname + " received.");
    console.log("Query: " + query);

    route(handle, pathname, query, response);
  }

  http.createServer(onRequest).listen(8888);
  console.log("Server is ready.");
}

exports.start = start;
