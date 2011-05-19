var ws = require('./vendor/websocket-server');

require('nclosure').nclosure({additionalDeps: ['../deps.js']});

goog.provide('server.main');

goog.require('inf.logic');

var server = ws.createServer();
server.addListener('connection', function (conn) {
    conn.addListener('message', function (msg) {
        server.send(msg);
    });
});

server.listen(8080);
