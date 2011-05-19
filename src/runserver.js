var fs = require('fs'),
    ws = require('./vendor/websocket-server');

require('goog').init('closure-library/closure/goog/');
eval(fs.readFileSync('deps.js', 'utf-8'));

var server = ws.createServer();
server.addListener('connection', function (conn) {
    conn.addListener('message', function (msg) {
        console.log(msg);
        server.send(msg);
    });
});

server.listen(8080);
