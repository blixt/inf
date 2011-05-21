#!/usr/bin/env node
// Copyright © Andreas Blixt 2011. MIT license.

var fs = require('fs'),
    ws = require('./vendor/websocket-server');

// Load the Google Closure Library.
require('./vendor/goog').init('closure-library/closure/goog/');
eval(fs.readFileSync('deps.js', 'utf-8'));

goog.require('inf.logic');

var server = ws.createServer();
server.addListener('connection', function (conn) {
    console.log('New connection!');
    conn.addListener('message', function (msg) {
        console.log('< ' + msg);
        server.send(msg);
    });
});

console.log('Listening on *:8080...')
server.listen(8080);
