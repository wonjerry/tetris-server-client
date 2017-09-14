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
        self.socket.emit('gotit');
        self.main.startGame(message);
        //self.socket.on('game packet', self.socketHandler.bind(self));
    });

    self.socket.on('activate start button', function () {
        // main의 대기화면 객체의 start button을 활성화 한다.
        console.log("hihihihihi");
    });

    self.main.on('start button down', function (param) {
        //main의 버튼이 눌렸음을 알린다
    });

    self.socket.on('start', function (param) {
        // 버튼이 눌렸을 때 client 전체에 start 시그널이 발생한다 각 클라이언트는 동시에 게임을 시작한다
    });

    self.socket.on('playerJoin', function (data) {
        // player가 입장했을 대 otherplayer를 생성하고 데이터를 구성한다
        console.log('connected in server :' + data.name);
    });
    // input을 서버로 보낸다
    self.main.on('Key_Pressed', function (input) {

        self.socket.emit('game packet', input);
    });
};


ClientManager.prototype.socketHandler = function (message) {
    var self = this;
    // 서버에 어떤 클라이언트가 입장했을 때
    if (message.type === 0) {
        if (message.id == self.socket.id) return;
        self.main.game.addPlayer(message);

        // 게임 플레이중일때 서버에서 처리한 input message
    } else if (message.type === 5) {

        //if (self.main.game.gameState !== 1) return;
        //game에도 message queue를 만들어야 한다
        self.main.game.messages.push(message);

    } else if (message.type === 6) {

        var length = message.otherPlayers.length;
        var localPlayerId = self.socket.id;
        var otherPlayers = message.otherPlayers;

        for (var i = 0; i < length; i++) {
            if (otherPlayers[i].id == localPlayerId) continue;

            self.main.game.addPlayer({order: otherPlayers[i].order, id: otherPlayers[i].id});
        }

        console.log(self.main.game.players)
    }
};

