var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var path = require('path');
var exec = require("child_process").exec;

var db = new sqlite3.Database('datacrush.db');

db.serialize(function() {
    
    // All the votes
    db.run("CREATE TABLE IF NOT EXISTS " +
    "         votes(station_id, button INTEGER, count INTEGER, artificial INTEGER, " +
    "               timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE INDEX IF NOT EXISTS station_ix ON votes (station_id)");
    db.run("CREATE INDEX IF NOT EXISTS button_ix  ON votes (button)");

    // Table of experiment runs. Add a row to this table to kick off a new run
    db.run("CREATE TABLE IF NOT EXISTS " +
    "         runs(run_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE INDEX IF NOT EXISTS timestamp_ix ON runs (timestamp)");
    db.run("INSERT INTO RUNS (run_id, timestamp) " +
    "         SELECT null, CURRENT_TIMESTAMP " +
    "            WHERE NOT EXISTS (SELECT * FROM runs) " +
    "            AND   NOT EXISTS (SELECT * FROM votes) " +
    "        UNION ALL " +
    "         SELECT null, MIN(timestamp) FROM votes " +
    "            WHERE NOT EXISTS (SELECT * FROM runs) " +
    "            AND   EXISTS (SELECT * FROM votes) " +
    "            GROUP BY 1");
    
    // View that shows us only the votes from the current run
    db.run("CREATE VIEW IF NOT EXISTS current_run AS " +
    "         SELECT * FROM votes " +
    "         WHERE timestamp >= coalesce( (SELECT MAX(timestamp) FROM runs), '1970-1-1')");
    
});

function dumpData(query, response) {
  var content = "no result";

  exec("sh dumpData.sh", function (error, stdout, stderr) {
    content = stdout;
    response.writeHead(200, {
        'Content-Type': "text/csv",
        'Content-Length': content.length,
        'Content-Disposition': 'attachment; filename=DataCrush.csv'
    });
    response.end(content, 'utf-8');
    
  });
}

function showFile(query, response, filePath, fileType) {

    path.exists(filePath, function(exists) {

        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, {
                        'Content-Type': fileType,
                        'Content-Length': content.length
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

function jquery(query, response) {
    var filePath = "jquery-1.7.1.min.js";
    showFile(query, response, filePath, "application/javascript");
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


function newRun(query, response) {
    
    // Start serialized mode
    db.serialize(function() {

        db.run("INSERT INTO runs (run_id) VALUES (NULL)", function(err) {
            if (err) {
                errorResponse(err, response);
            }
        });
    });  
}

function stationVotes(query, response) {
    
    // The XBee's 64-bit serial number:
    var stationID = query["s"];

    var counts = [0, 0, 0];

    console.log("Got request for votes for station " + stationID);

    // Start serialized mode
    db.serialize(function() {

        // Find the current number of counts.
        // Prepare a statement for this.
        var stmt = db.prepare(
            "SELECT button, SUM(count) AS total FROM current_run WHERE station_id = ? GROUP BY button",
            function(err) {
                if (err) {
                    errorResponse(err, response);
                }
            }
        );

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
    });

}

function vote(query, response) {

    var rc;
    var body;

    // The XBee's 64-bit serial number:
    var stationID = query["s"];

    // Number of the button that was pressed
    var button = query["b"];

    // Number of votes (negative OK)
    var count = query["c"];
    

    // Is this artificial? (blank OK)
    var artificial = query["a"];
    if (!artificial) {
        artificial = 0;
    }

    if (!count) { // default if not specified
        count = 1;
    }
    console.log("Station " + stationID + " cast " + count + " vote(s) for " + button);

    if (!stationID || !button) {

        errorResponse("s='" + stationID + "', b='" + button, response);

    } else {

        // Start serialized mode
        db.serialize(function() {

            var counts = [0, 0, 0];
            if (button > counts.length - 1 || button.length > 1) {

                console.log("Warning: button #" + button + 
                            " is higher than last array element " + 
                            (counts.length - 1));
                stationVotes(query, response);

            } else {

                // Add to the current vote
                var stmt = db.prepare("INSERT INTO votes (station_id, button, count, artificial) VALUES (?, ?, ?, ?)");
                stmt.run(stationID, button, count, artificial,
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

    var body;

    // Start serialized mode
    db.serialize(function() {
        var stmt = db.prepare( 
            /* Fetch the tallies of votes from the current run, but for convenience,
               pull in rows (with zero votes) from previous runs so they appear in 
               the dashboard.
             */
            "SELECT station_id, button, SUM(count) AS total " +
            "  FROM current_run GROUP BY station_id, button " +
            "UNION SELECT station_id, button, 0 AS total " +
            "        FROM votes WHERE station_id NOT IN " +
            "        (SELECT station_id FROM current_run " +
            "           WHERE button=votes.button) GROUP BY station_id, button",
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
                    //console.log(jsonresult);
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

exports.jquery = jquery;
exports.css = css;
exports.dash = dash;
exports.fetch = fetch;
exports.vote = vote;
exports.stationVotes = stationVotes;
exports.newRun = newRun;
exports.dumpData = dumpData;
