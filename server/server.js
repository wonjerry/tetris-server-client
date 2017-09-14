var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('./util');
var global = require('../client/src/global');
var TetrisGame = require('./logic/tetris');
var RoomManager = require('./roommanager');

var roomManager = new RoomManager(io);

var users = [];
var sockets = {};

app.use(express.static(__dirname + '/../client/public'));

/*클라이언트에서 접속이 이루어지고 서버로 요청이 들어오면 받아서 새로운 플레이어를 만들어 준다 그리고 클라이언트에 보내준다..*/
io.on('connection', function (socket) {

    socket.on('join', function (message) {
        console.log('Client has connected!!!!: ' + socket.id);
        roomManager.requestGameRoom(socket);
    });

    socket.on('disconnect', function () {
        console.log('Client has disconnected: ' + socket.id);
        //roomManager.userDisconnect(socket);
    });

});

http.listen(global.port, function () {
    console.log('[DEBUG] Listening on 127.0.0.1 : 3000');
});
