var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var path = require('path');
var db = new sqlite3.Database('datacrush.db');

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS " +
    "votes(station_id, button INTEGER, count INTEGER, " +
    "      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    
    db.run("CREATE INDEX IF NOT EXISTS station_ix ON votes (station_id)");
    db.run("CREATE INDEX IF NOT EXISTS button_ix  ON votes (button)");
});

function showFile(query, response, filePath, fileType) {

    path.exists(filePath,
    function(exists) {

        if (exists) {
            fs.readFile(filePath,
            function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, {
                        'Content-Type': fileType
                    });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });


}

function dash(query, response) {
    var filePath = "dashboard.html";
    showFile(query, response, filePath, "text/html");
}

function css(query, response) {
    var filePath = "style.css";
    showFile(query, response, filePath, "text/css");
}

function errorResponse(err, response) {
    var body = "ERR: " + err + "\n";
    console.log(err);
    response.writeHead(500, {
        "Content-Type": "text/plain",
        "Content-Length": body.length
    });
    response.write(body);
    response.end();
}

function stationVotes(query, response) {
    
    // The XBee's 64-bit serial number:
    var stationID = query["s"];

    var counts = [0, 0, 0];

    // Find the current number of counts.
    // Prepare a statement for this.
    var stmt = db.prepare(
        "SELECT button, SUM(count) AS total FROM votes WHERE station_id = ? GROUP BY button",
        function(err) {
            if (err) {
                errorResponse(err, response);
            }
        });

    // Process each row in the statement
    stmt.each(stationID,
        
        function(err, row) { // row callback
            if (err) {
                errorResponse(err, response);
            } else {
                counts[row.button] = row.total;
            }
        },

        function(err, rowcount) { // completion callback
            if (err) {
                errorResponse(err, response);
            } else {
                body = counts.join(":") + "\n";
                response.writeHead(200, {
                    "Content-Type": "text/plain",
                    "Content-Length": body.length
                });
                response.write(body);
                response.end();
            }
        }
    );
    stmt.finalize();

}

function vote(query, response) {

    console.log("Request handler: vote");
    console.log(query);

    var rc;
    var body;

    // The XBee's 64-bit serial number:
    var stationID = query["s"];

    // Number of the button that was pressed
    var button = query["b"];

    // Number of votes (negative OK)
    var count = query["c"];

    if (!count) { // default if not specified
        count = 1;
    }

    if (!stationID || !button) {

        errorResponse("s='" + stationID + "', b='" + button, response);

    } else {

        // Start serialized mode
        db.serialize(function() {

            var counts = [0, 0, 0];
            console.log(button);
            if (button > counts.length - 1 || button.length > 1) {

                console.log("Warning: button #" + button + 
                            " is higher than last array element " + 
                            (counts.length - 1));

            } else {

                // Add to the current vote
                console.log("Station " + stationID + ", button " + button + ", vote value: " + count);
                var stmt = db.prepare("INSERT INTO votes (station_id, button, count) VALUES (?, ?, ?)");
                stmt.run(stationID, button, count, 
                    function(err) { // statement callback
                        if (err) {
                            errorResponse(err, response);
                        } else {
                            stationVotes(query, response);
                        }
                    }
                );
                stmt.finalize();

            }
            

        });

    }

}


function fetch(query, response) {

    console.log("Request handler: fetch");

    var body;

    // Start serialized mode
    db.serialize(function() {
        
        var stmt = db.prepare( // Fetch the tallies of votes.
            "SELECT station_id, button, SUM(count) AS total FROM votes GROUP BY station_id, button",
            function(err) {
                if (err) {
                    errorResponse(err, response);
                }
            }
        );

        var jsonresult = {};
        stmt.each(
            function(err, row) { // row callback
                if (err) {
                    errorResponse(err, response);
                } else {
                    if (!jsonresult[row.station_id]) {
                        jsonresult[row.station_id] = {};
                        jsonresult[row.station_id][0] = 0; // FIXME replace this with a for loop that knows the # of buttons
                        jsonresult[row.station_id][1] = 0;
                        jsonresult[row.station_id][2] = 0;
                    }
                    jsonresult[row.station_id][row.button] = row.total;
                }
            },
            function(err, rowcount) { // completion callback
                if (err) {
                    errorResponse(err, response);
                } else {
                    console.log(jsonresult);
                    body = JSON.stringify(jsonresult) + "\n";
                    response.writeHead(200, {
                        "Content-Type": "text/plain",
                        "Content-Length": body.length
                    });
                    response.write(body);
                    response.end();
                }
            }
        );
        stmt.finalize();
    });

}

exports.css = css;
exports.dash = dash;
exports.fetch = fetch;
exports.vote = vote;
exports.stationVotes = stationVotes;
