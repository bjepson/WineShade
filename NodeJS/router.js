function route(handle, pathname, query, response) {
  
  console.log("Routing for " + pathname);
  
  if (typeof handle[pathname] === 'function') {
    handle[pathname](query, response);
  } else {
    
    console.log("No handler for " + pathname);
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not found");
    response.end();
  }
}

exports.route = route;
