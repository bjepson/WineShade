#!/bin/sh

sqlite3 datacrush.db <<EOF
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
