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

    self.setupStartButton();

    self.setupSocket();
}

ClientManager.prototype.setupSocket = function () {
    var self = this;

    self.socket.emit('join');

    // Handle error.
    self.socket.on('connect_failed', function () {
        self.socket.close();
        global.disconnected = true;
    });

    self.socket.on('disconnect', function () {
        self.socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    self.socket.on('welcome', function (message) {
        self.roomId = message.roomId;
        self.main.initGame(message);

        self.socket.on('game packet', function (message) {
            self.main.socketHandler.call(self.main, message);
        });
    });



    self.socket.on('activate start button', function () {
        // main의 대기화면 객체의 start button을 활성화 한다.
        self.button.disabled = false;
    });

    self.socket.on('player number', function (data) {
        self.button.innerHTML = "Players waiting in this room : " + data.num;
    });

    self.socket.on('start', function (param) {
        // 버튼이 눌렸을 때 client 전체에 start 시그널이 발생한다 각 클라이언트는 동시에 게임을 시작한다

        self.main.startGame();
    });

    // input을 서버로 보낸다
    self.main.on('Key_Pressed', function (input) {

        self.socket.emit('game packet', input);
    });
};

ClientManager.prototype.setupStartButton = function () {
    var self = this;

    self.button = document.getElementById("startButton");
    self.button.disabled = true;
    self.button.addEventListener('click', function () {
        self.socket.emit('start' , {roomId : self.roomId});
    })
};
