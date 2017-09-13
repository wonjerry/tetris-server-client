
/*var express = require('express');
var app = express();
var http = require('http').Server(app);

var io = require('socket.io')(http);
var path = require('path');
var RoomManager = require('./roommanager');

app.use('/', express.static(path.join(__dirname, './../client/public')));

var roomManager = new RoomManager(io);

io.on('connection', function (socket) {

    socket.on('join', function (message) {
        console.log('Client has connected!!!!: ' + socket.id);
        roomManager.requestGameRoom(socket);
    });

    socket.on('disconnect', function () {
        console.log('Client has disconnected: ' + socket.id);
        roomManager.userDisconnect(socket);
    });

});


http.listen(3000, '127.0.0.1', function () {
    console.log('[DEBUG] Listening on 127.0.0.1 : 3000');
});
*/