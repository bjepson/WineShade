var minimal = require("minimal");

function root(query, response) {
  
  console.log("Request handler: root");

  var $m = minimal.template("<html><head><title></title><body><p id='content'></p></body></html>");

  $m({
    title: "Data Crush Dashboard",
    content: "Coming soon..."
  });
  
  response.writeHead(200, {
    "Content-Type":   "text/html",
    "Content-Length": $m.html().length});
  response.write($m.html());
  response.end();

}

function vote(query, response) {
  console.log("Request handler: vote");
  
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.write("1:1:1");
  response.end();
}

exports.root = root;
exports.vote = vote;
