var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('./util');
var global = require('./../client/global');
var TetrisGame = require('./tetris');


/*game 객체와 일정시간 반복을 위한 handler 객체를 전역으로 정의하였다.*/
var users = [];
var sockets = {};

app.use(express.static(__dirname + '/../client'));


/*클라이언트에서 접속이 이루어지고 서버로 요청이 들어오면 받아서 새로운 플레이어를 만들어 준다 그리고 클라이언트에 보내준다..*/
io.on('connection', function(socket) {
  if (socket.handshake.query.type === 'tetris') setupTetrisSocket(socket);

});

function setupTetrisSocket(socket) {
  console.log('A user connected!');
  /*클라이언트에서 io.on({query:"type=" + type}) 이라고 어떤 토큰을 주면 서버에서서는 소켓을 통해
  socket.handshake.query.type으로 받을 수 있나보다.*/
  // 이 기능을 이용해서 나중에는 서버로 게임의 종류를 보내면 그걸 받아서 실행 시킬 수 있겠다.
  // 테트리스 서버가 필요하면 이 파일을 실행시키고 다른 서버가 필요하면 다른 서버를 실행 시키는건가?

  var currentPlayer = new TetrisGame(); // 이제 각 게임들을 이렇게 불러와서 적용 시킬 수도 있겠다.

  // 다른 게임 객체들에도 setId, setStartX를 기본적으로 넣어 두어야 겠다.
  // 또한 game상태를 주고받기 위해 getGameData함수도 넣어두어야 겠다.
  currentPlayer.setId(socket.id);
  currentPlayer.setStartX(users.length * 360);

  socket.on('respawn', function() {
    /*users 객체에 동일 아이디의 player가 있는지 확인 후 있으면 users 배열에서 원래 것을 뺀다.*/
    if (util.findIndex(users, currentPlayer.getId()) > -1)
      users.splice(util.findIndex(users, currentPlayer.getId()), 1);
    /*클라이언트에게 game 객체의 데이터만 모은 객체를 전송 해 준다.*/

    socket.emit('welcome', currentPlayer.getGameData());
    console.log('[INFO] User respawned!');
  });

  /*해당 클라이언트에 socket에 대해 접속할 수 있는지의 여부를 따지고 응답 해 준다.*/
  socket.on('gotit', function() {
    console.log('[INFO] Player connecting....');

    if (util.findIndex(users, currentPlayer.getId()) > -1) {
      console.log('[INFO] Player ID is already connected, kicking.');
      socket.disconnect();
    } else {
      /*접속할 수 있으면 sockets배열에 사용자id 인덱스에 사용자를 추가한다 그리고 기본 셋팅을 초기화 해 준다.*/
      console.log('[INFO] Player connected!');
      sockets[currentPlayer.getId()] = socket;
      // 현재 들어온 player의 정보를 초기 세팅하고 users 배열에 넣는다.
      users.push(currentPlayer);

      io.emit('playerJoin', {
        name: currentPlayer.getId()
      });
      console.log('Total players: ' + users.length);
    }
    // 여기서는 연결이 완료된 부분이니까 일단 현재 게임의 Handler를 지정 해 두고 돌리면 각각 돌아가지 않을까
    // 근데 어쨌든 이것도 사람이 많아질수록 내부적으로 interval이 돌기 때문에 부하가 커질 것 같다.
    currentPlayer.setIntervalHandler(setInterval(
      function() {
        if (currentPlayer.go()) {
          sockets[currentPlayer.getId()].emit('serverTellPlayerMove', currentPlayer.getGameData());
        } else {
          //게임 오버 되었을 경우를 처리 해줘야함.
          // 유저에게 어떤 시그널을 보내서 처리하게 한다든지 해야할듯
          clearInterval(currentPlayer.getIntervalHandler());
        }
      },
      global.FALLING_TIME
    ));

  });

  socket.on('disconnect', function() {
    if (util.findIndex(users, currentPlayer.getId()) > -1)
      users.splice(util.findIndex(users, currentPlayer.getId()), 1);
    console.log('[INFO] User disconnected!');

    socket.broadcast.emit('playerDisconnect', {
      name: currentPlayer.getId()
    });
  });

  var Key = {
    _pressed: {},

    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,

    isDown: function(keyCode) {
      return this._pressed[keyCode];
    },

    onKeydown: function(keyCode) {
      this._pressed[keyCode] = true;
    },

    onKeyup: function(keyCode) {
      delete this._pressed[keyCode];
    }
  };

  // 나는 어떤 키보드가 눌렸을 경우는 on 하고 있다가 눌리면 그것에 대한 응답 및 처리를 즉각적으로 해 주어야 한다.
  // 그럼 이런 방식으로 key 값에 대한 응답 내용을 작성하면 될 듯 하다.

  socket.on('Key_Pressed', function(keys) {
    switch (keys.data) {
      case 'Up_Key':
        if (currentPlayer.rotateRight()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'Down_Key':
        if (currentPlayer.steerDown()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'Left_Key':
        if (currentPlayer.steerLeft()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'Right_Key':
        if (currentPlayer.steerRight()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'A_Key':
        if (currentPlayer.rotateLeft()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'S_Key':
        if (currentPlayer.rotateRight()) {
          socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        }
        break;
      case 'Shift_Key':
        currentPlayer.hold();
        socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        break;
      case 'R_Key':
        clearInterval(currentPlayer.getIntervalHandler());
        currentPlayer = new TetrisGame();
        currentPlayer.setIntervalHandler(setInterval(
          function() {
            if (currentPlayer.go()) {
              sockets[currentPlayer.getId()].emit('serverTellPlayerMove', currentPlayer.getGameData());
            } else {
              clearInterval(currentPlayer.getIntervalHandler());
            }
          },
          global.FALLING_TIME
        ));
        break;
      case 'Space_Key':
        currentPlayer.letFall();
        socket.emit('serverTellPlayerMove', currentPlayer.getGameData());
        break;
      case 'Enter_Key':
        if (currentPlayer.getisPause()) {
          currentPlayer.setIsPause(false);
          currentPlayer.setIntervalHandler(setInterval(
            function() {
              if (currentPlayer.go()) {
                sockets[currentPlayer.id].emit('serverTellPlayerMove', currentPlayer.getGameData());
              } else {
                clearInterval(currentPlayer.getIntervalHandler());
              }
            },
            global.FALLING_TIME
          ));

        } else {
          clearInterval(currentPlayer.getIntervalHandler());
          currentPlayer.setIsPause(true);
          socket.emit('UpdateIsPause', {
            data: currentPlayer.getisPause()
          });
        }
        break;
    }

  });
}

//아이피 설정을 어떻게 해야할지 모르겠다.
http.listen(global.port, global.host, function() {
  console.log('[DEBUG] Listening on 127.0.0.1 : 3000');
});
