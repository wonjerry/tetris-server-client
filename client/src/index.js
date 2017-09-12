var io = require('socket.io-client');
var global = require('./global');
var Main = require('./main');

window.onload = function () {
    new ClientManager();
};

function ClientManager() {
    var self = this;

    if (!(self instanceof ClientManager)) new ClientManager();

    self.main = new Main();
    self.socket = io({
        query: "type=tetris"
    });

    self.setupSocket(self.socket);
}

ClientManager.prototype.setupSocket = function (socket) {
    var self = this;

    socket.emit('respawn');

    // Handle error.
    socket.on('connect_failed', function () {
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function () {
        socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    socket.on('welcome', function (playerSettings) {
        socket.emit('gotit');
        self.main.startGame(playerSettings);
    });

    socket.on('playerJoin', function (data) {
        console.log('connected in server :' + data.name);
    });

    self.main.on('Key_Pressed', function (key) {
        socket.emit('Key_Pressed', key);
    });

    socket.on('playerDisconnect', function (data) {
        console.log('Disconnected in server : ' + data.name);
    });


    socket.on('serverTellPlayerMove', function (playerSettings) {
        self.main.emit('redraw', playerSettings);
        //canvas.emit('drawOtherUsers',playerSettings) ;
    });

    socket.on('users', function (users) {
        self.main.emit('drawUsers', users);
    });
};

