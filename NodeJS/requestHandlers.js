var minimal = require("minimal");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('datacrush.db');

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS " +
         "votes(station_id, button INTEGER, count INTEGER, " + 
         "PRIMARY KEY (station_id, button))");
});

function root(query, response) {
  
  console.log("Request handler: root");

  var $m = minimal.template("<html><head><title></title><body><div id='content'><p></p></div></body></html>");

  $m({
    title: "Data Crush Dashboard",
    content: ["Coming soon...", "to a browser near you"]
  });
  
  response.writeHead(200, {
    "Content-Type":   "text/html",
    "Content-Length": $m.html().length});
  response.write($m.html());
  response.end();

}

function errorResponse(err, response) {
  var body = "ERR: " + err + "\n";
  console.log(err);
  response.writeHead(500, {
    "Content-Type":   "text/plain",
    "Content-Length": body.length});
  response.write(body);
  response.end();
}

function vote(query, response) {
  
  console.log("Request handler: vote");

  var rc;
  var body;
  
  var stationID = query["s"]; // The XBee's 64-bit serial number
  var button    = query["b"]; // Number of the button that was pressed
  var count     = query["c"]; // Number of votes (negative OK)
  if (!count) {
    count = 1; // default if not specified
  }
  
  if (!stationID || !button) {
    
    errorResponse("s='" + stationID + "', b='" + button, response);
    
  } else {
    
    // Start serialized mode
    db.serialize(function() {

      var counts = [0, 0, 0];
      if (button > counts.length - 1) {
        
        console.log("Warning: button #" + button +" is higher than last array element " + (counts.length - 1));
        
      } else {

        // Increment the count of the current vote
        console.log("Station " + stationID + ", button " + button + ", vote value: " + count);
        var stmt = db.prepare("INSERT OR REPLACE INTO votes VALUES (?, ?, coalesce((SELECT count FROM votes WHERE station_id = ? AND button = ?) + ?, 1))");
        stmt.run(stationID, button, stationID, button, count);
        stmt.finalize();
        
      }
      
      // Find out the current number of counts.
      var query = db.prepare("SELECT button, count FROM votes WHERE station_id = ?",
        function(err) { 
          if (err) {
            errorResponse(err, response);          
          }
      });
      
      query.each(stationID, 
        function(err, row) { 
          if (err) {
            errorResponse(err, response);                      
          } else {
            counts[row.button] = row.count;
          }
        },
        
        function(err, rowcount) {
          console.log(counts);
          if (err) {
            errorResponse(err, response);                      
          } else {
            body = counts.join(":") + "\n";
            response.writeHead(200, {
              "Content-Type":   "text/plain",
              "Content-Length": body.length});
              response.write(body);
              response.end();
            }
          }
        );
      query.finalize();

    });
  
  }
  
}

exports.root = root;
exports.vote = vote;
