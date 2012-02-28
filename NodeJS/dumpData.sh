#!/bin/sh

sqlite3 datacrush.db <<EOF
CREATE VIEW IF NOT EXISTS run_spans AS 
  SELECT start.run_id AS run_id, MAX(start.timestamp) AS start, MIN(end.timestamp) AS end
    FROM runs start, runs end 
    WHERE start.timestamp < end.timestamp GROUP BY start.run_id
    UNION
    SELECT MAX(run_id) AS run_id, MAX(timestamp) AS start, '9999-12-31' AS end
      FROM runs
    UNION 
    SELECT 0 AS run_id, '1970-1-1' AS start, MIN(timestamp) AS end
      FROM runs;

.headers ON
.separator ,
SELECT run_id, station_id,
       COALESCE(SUM(CASE WHEN button = 0 AND NOT artificial THEN count END), 0) AS btn0,
       COALESCE(SUM(CASE WHEN button = 1 AND NOT artificial THEN count END), 0) AS btn1,
       COALESCE(SUM(CASE WHEN button = 2 AND NOT artificial THEN count END), 0) AS btn2,
       COALESCE(SUM(CASE WHEN button = 0 AND artificial THEN count END), 0) AS artificial0,
       COALESCE(SUM(CASE WHEN button = 1 AND artificial THEN count END), 0) AS artificial1,
       COALESCE(SUM(CASE WHEN button = 2 AND artificial THEN count END), 0) AS artificial2
    FROM run_spans, votes
    WHERE votes.timestamp < run_spans.end 
    AND votes.timestamp >= run_spans.start
    GROUP BY run_id, station_id
    ORDER BY run_id, station_id;
EOF
