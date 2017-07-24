var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('./util');

/*테트리스 게임이 진행되는 부분을 borad라고 정의하고 그 borad의 너비와 높이를 정하였다.*/
var BOARD_WIDTH = 10;
var BOARD_HEIGHT = 20;

/*여기서 block은 실제 테트리스 게임에 나오는 블록을 이루는 작은 네모들이다.*/
var BLOCK_WIDTH = 30;
var BLOCK_HEIGHT = 30;
/*떨어지는 시간을 정의하였다.*/
var FALLING_TIME = 400;

/*P5.js에서 keycode가 정의되어 있지 않은 부분을 가독성을 위해 변수로 정의하였다.*/
var KEY_SPACE = 32;
var KEY_SHIFT = 16;

/*game 객체와 일정시간 반복을 위한 handler 객체를 전역으로 정의하였다.*/
var users = [];
var sockets = {};

app.use(express.static(__dirname + '/../client'));

/*블록 개체들을 다루기 위한 클래스 이다.*/
function Shape() {
  this.BLOCKS = [
    [
      [0,0,0,0],
      [0,11,11,0],
      [0,11,11,0],
      [0,0,0,0],
    ],
    [
      [0,0,12,0],
      [0,0,12,0],
      [0,0,12,0],
      [0,0,12,0],
    ],
    [
      [0,0,0,0],
      [0,13,13,0],
      [0,0,13,13],
      [0,0,0,0],
    ],
    [
      [0,0,0,0],
      [0,0,14,14],
      [0,14,14,0],
      [0,0,0,0],
    ],
    [
      [0,0,15,0],
      [0,15,15,0],
      [0,0,15,0],
      [0,0,0,0],
    ],
    [
      [0,16,0,0],
      [0,16,0,0],
      [0,16,16,0],
      [0,0,0,0],
    ],
    [
      [0,0,17,0],
      [0,0,17,0],
      [0,17,17,0],
      [0,0,0,0],
    ]
  ];
  this.X = 3;
  this.Y = 0;
  this.currentBlock = this.randomBlock();
  this.nextBlock = this.randomBlock();
  this.holdBlock = [
    [0,0,0,0],
    [0,0,0,0],
    [0,0,0,0],
    [0,0,0,0]
  ];
}

Shape.prototype.rotateRight = function(block){
  return [
    [block[3][0],block[2][0],block[1][0],block[0][0]],
    [block[3][1],block[2][1],block[1][1],block[0][1]],
    [block[3][2],block[2][2],block[1][2],block[0][2]],
    [block[3][3],block[2][3],block[1][3],block[0][3]]
  ];
}

Shape.prototype.rotateLeft = function(block){
  return [
    [block[0][3],block[1][3],block[2][3],block[3][3]],
    [block[0][2],block[1][2],block[2][2],block[3][2]],
    [block[0][1],block[1][1],block[2][1],block[3][1]],
    [block[0][0],block[1][0],block[2][0],block[3][0]]
  ];
}

Shape.prototype.intersectCheck = function(y,x,block,board){
  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      if(block[i][j]){
        if( i + y >= BOARD_HEIGHT || j + x >= BOARD_WIDTH || j + x < 0 || board[y+i][x+j]){
          return true; /* 움직였을 때 어떤 물체 또는 board 끝에 겹침을 뜻함*/
        }
      }
    }
  }
  return false;
}

Shape.prototype.applyBlock = function(y,x,block,board){
  var newBoard = [];

  for(var i =0; i<BOARD_HEIGHT; i++){
    newBoard[i] = board[i].slice();
  }

  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      if(block[i][j]){
        newBoard[i+y][j+x] = block[i][j];
      }
    }
  }
  return newBoard;
}

Shape.prototype.deleteLine = function(board){
    var newBoard = [];
    var count = BOARD_HEIGHT;
    for(var i=BOARD_HEIGHT; i --> 0;){
      for(var j=0; j<BOARD_WIDTH; j++){
        if(!board[i][j]){/* 0인 성분이 있으면 한줄이 다 안 채워진 것이므로 붙여넣기 해 준다.*/
          /*--count로 아래부터 새로운 board를 채워주는 이유는 맨 아래줄부터 1로 채워진 줄이 있다면 자동적으로
          새로운 board에는 추가되지 않기 때문이다. 이 이후에 맨위부터 count까지는 0으로 채워 주어야 한다.*/
          newBoard[--count] = board[i].slice();
          break;
        }
      }
    }

    for(var i = 0; i < count; i++){
      newBoard[i] = [];
      for(var j = 0; j < BOARD_WIDTH; j++){
        newBoard[i][j] = 0;
      }
    }

    return {
      'board' : newBoard,
      'deletedLineCount' : count
    };
}

Shape.prototype.randomBlock = function(){
  return this.BLOCKS[Math.floor(Math.random()*this.BLOCKS.length)];
}

Shape.prototype.clone = function(origin,target){
  for(var i = 0; i < 4; i++){
    target[i] = origin[i].slice();
  }
}

Shape.prototype.emptyCheck = function(block){
  for(var i =0; i<4; i++){
    for(var j=0; j<4; j++){
      if(block[i][j]) return false;
    }
  }

  return true;
}


/*전체적으로 게임을 진행시키기 위한 데이터와 메소드를 담고있는 객체*/
function TetrisGame(){

  this.intervalHandler;

  this.isGameOver = false;
  this.isPause = false;
  this.holdable = true;

  this.block = new Shape();

  this.startX = 0;
  this.score = 0;
  /*id는 각 클라이언트 소켓에 할당된 id로 지정한다.*/
  this.id = -1;

  this.board = [];

  for(var i = 0; i < BOARD_HEIGHT; i++){
    this.board[i] = [];
    for(var j = 0; j< BOARD_WIDTH; j++){
      this.board[i][j] = 0;
    }
  }

}

/*interval 함수의 인자로 쓰일 함수이다. 시간 간격 이후에 할 일을 정의한다.
1. 현재 Gameover 상태인지 체크한다.
2. 현재 블록이 내려갔을때 겹치는지 체크한다.
  2-1. 겹치면 블록을 현재 위치에 적용시킨다
  2-2. 블록이 한 줄 다 채워졌는지 체크하여 지운다.
  2-3. 만약 새로나올 블록의 위치에 어떤 블록이 나오면 Gameover 상태로 바꾼다.
  2-4. 그게 아니라면 다음 블록을 내보낸다.

3.  겹치지 않는다면 블록을 한 칸 내린다.
*/
TetrisGame.prototype.go = function() {
  if(this.getisGameover()){
    return false;
  }

  if(this.block.intersectCheck(this.block.Y + 1, this.block.X ,this.block.currentBlock, this.board)){
    this.board = this.block.applyBlock(this.block.Y, this.block.X ,this.block.currentBlock, this.board);
    var r = this.block.deleteLine(this.board);
    this.board = r.board;
    this.score += r.deletedLineCount*r.deletedLineCount*10;
    this.setHoldable(true);
    if(this.block.intersectCheck( 0, 3 ,this.block.nextBlock, this.board)){
      this.setIsGameover(true);
    }else{
      this.block.currentBlock = this.block.nextBlock;
      this.block.nextBlock = this.block.randomBlock();
      this.block.X = 3;
      this.block.Y = 0;
    }
  }else{
    this.block.Y += 1;

  }
  return true;
}

TetrisGame.prototype.steerLeft = function() {
  if(!this.block.intersectCheck(this.block.Y, this.block.X - 1 ,this.block.currentBlock, this.board)){
     this.block.X -= 1;
     return true;
  }
  return false;
}

TetrisGame.prototype.steerRight = function() {
  if(!this.block.intersectCheck(this.block.Y, this.block.X + 1 ,this.block.currentBlock, this.board)){
     this.block.X += 1;
     return true;
  }
  return false;
}

TetrisGame.prototype.steerDown = function() {
  if(!this.block.intersectCheck(this.block.Y+1, this.block.X ,this.block.currentBlock, this.board)){
    this.block.Y += 1;
    return true;
  }
  return false;
}

TetrisGame.prototype.rotateLeft = function() {
var newBlock = rotateLeft(this.block.currentBlock);
  if(!this.block.intersectCheck(this.block.Y, this.block.X ,newBlock, this.board)){
     this.block.currentBlock = newBlock;
     return true;
  }
  return false;
}

TetrisGame.prototype.rotateRight = function() {
  var newBlock = this.block.rotateRight(this.block.currentBlock);
  if(!this.block.intersectCheck(this.block.Y, this.block.X ,newBlock, this.board)){
     this.block.currentBlock = newBlock;
     return true;
  }
  return false;
}

TetrisGame.prototype.letFall = function() {
  while(!this.block.intersectCheck(this.block.Y + 1, this.block.X ,this.block.currentBlock, this.board)){
     this.block.Y += 1;
  }
  this.go();
}

TetrisGame.prototype.hold = function() {
  this.holdable = false;
  /* hold블록이 비어있으면 currentBlock에 nextblock을 넣어줘야 한다.*/
  if(this.block.emptyCheck(this.block.holdBlock)){
    this.block.clone(this.block.currentBlock,this.block.holdBlock);
    this.block.clone(this.block.nextBlock, this.block.currentBlock);
    this.block.nextBlock = this.block.randomBlock();
  }else{
    var temp = [];
    for(var i =0; i<4; i++){
      temp[i] = [];
    }

    this.block.clone(this.block.holdBlock,temp);
    this.block.clone(this.block.currentBlock,this.block.holdBlock);
    this.block.clone(temp,this.block.currentBlock);

  }

}

TetrisGame.prototype.getBlockX = function() {
return this.block.X;
}

TetrisGame.prototype.getBlockY = function() {
return this.block.Y;
}

TetrisGame.prototype.getisGameover = function() {
return this.isGameOver;
}

TetrisGame.prototype.getisPause = function() {
return this.isPause;
}

TetrisGame.prototype.setIsGameover = function(bool) {
this.isGameOver = bool;
}

TetrisGame.prototype.setIsPause = function(bool) {
this.isPause = bool;
}

TetrisGame.prototype.getScore = function() {
return this.score;
}
TetrisGame.prototype.getCurrentBlock = function() {
return this.block.currentBlock;
}

TetrisGame.prototype.getNextBlock = function() {
return this.block.nextBlock;
}

TetrisGame.prototype.setHoldBlock = function(input) {
  this.block.holdBlock = input;
}

TetrisGame.prototype.getHoldBlock = function() {
return this.block.holdBlock;
}

TetrisGame.prototype.getHoldable = function() {
return this.holdable;
}

TetrisGame.prototype.setHoldable = function(input) {
  this.holdable = input;
}

TetrisGame.prototype.getBoard = function() {
return this.block.applyBlock(this.block.Y, this.block.X ,this.block.currentBlock, this.board);
}



/*클라이언트에서 접속이 이루어지고 서버로 요청이 들어오면 받아서 새로운 플레이어를 만들어 준다 그리고 클라이언트에 보내준다..*/
io.on('connection', function (socket) {
    console.log('A user connected!');
    /*클라이언트에서 io.on({query:"type=" + type}) 이라고 어떤 토큰을 주면 서버에서서는 소켓을 통해
    socket.handshake.query.type으로 받을 수 있나보다.*/

    var currentPlayer = new TetrisGame();
    currentPlayer.id = socket.id;
    currentPlayer.startX = users.length * 360;

    socket.on('respawn', function () {
      /*users 객체에 동일 아이디의 player가 있는지 확인 후 있으면 users 배열에서 원래 것을 뺀다.*/
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        /*클라이언트에게 생성된 객체를 전송 해 준다.*/
        socket.emit('welcome', currentPlayer);
        console.log('[INFO] User respawned!');
    });

    /*해당 클라이언트에 socket에 대해 접속할 수 있는지의 여부를 따지고 응답 해 준다.*/
    socket.on('gotit', function (player) {
        console.log('[INFO] Player connecting....');

        if (util.findIndex(users, player.id) > -1) {
            console.log('[INFO] Player ID is already connected, kicking.');
            socket.disconnect();
        } else {
          /*접속할 수 있으면 sockets배열에 사용자id 인덱스에 사용자를 추가한다 그리고 기본 셋팅을 초기화 해 준다.*/
            console.log('[INFO] Player connected!');
            sockets[player.id] = socket;

            currentPlayer = player;
            // 현재 들어온 player의 정보를 초기 세팅하고 users 배열에 넣는다.
            users.push(currentPlayer);

            io.emit('playerJoin', { name: currentPlayer.id });
            console.log('Total players: ' + users.length);
        }
        // 여기서는 연결이 완료된 부분이니까 일단 현재 게임의 Handler를 지정 해 두고 돌리면 각각 돌아가지 않을까
        // 근데 어쨌든 이것도 사람이 많아질수록 내부적으로 interval이 돌기 때문에 부하가 커질 것 같다.
        currentPlayer.intervalHandler = setInterval(
          function () {
            if (currentPlayer.go()){
              sockets[currentPlayer.id].emit('serverTellPlayerMove', currentPlayer);
            }else{
              //게임 오버 되었을 경우를 처리 해줘야함.
              // 유저에게 어떤 시그널을 보내서 처리하게 한다든지 해야할듯
              clearInterval(currentPlayer.intervalHandler);
            }
          },
          FALLING_TIME
        );

    });

    socket.on('disconnect', function () {
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        console.log('[INFO] User disconnected!');

        socket.broadcast.emit('playerDisconnect', { name: currentPlayer.id });
    });

    // 나는 어떤 키보드가 눌렸을 경우는 on 하고 있다가 눌리면 그것에 대한 응답 및 처리를 즉각적으로 해 주어야 한다.
    // 그럼 이런 방식으로 key 값에 대한 응답 내용을 작성하면 될 듯 하다.
    socket.on('Up_Key', function() {
        if(currentPlayer.rotateLeft()){
          socket.emit('UpdateCurrentBlock', {data : currentPlayer.getCurrentBlock()} );
        }
    });

    socket.on('Down_Key', function() {
      if(currentPlayer.steerDown()){
        socket.emit('UpdateBlockY', {data : currentPlayer.getBlockY()} );
      }
    });

    socket.on('Left_Key', function() {
      if(currentPlayer.steerLeft()){
        socket.emit('UpdateBlockX', {data : currentPlayer.getBlockX()} );
      }
    });

    socket.on('Right_Key', function() {
      if(currentPlayer.steerRight()){
        socket.emit('UpdateBlockX', {data : currentPlayer.getBlockX()} );
      }
    });

    socket.on('A_Key', function() {
      if(currentPlayer.rotateLeft()){
        socket.emit('UpdateCurrentBlock', {data : currentPlayer.getCurrentBlock()} );
      }
    });

    socket.on('S_Key', function() {
      if(currentPlayer.rotateRight()){
        socket.emit('UpdateCurrentBlock', {data : currentPlayer.getCurrentBlock()} );
      }
    });

    socket.on('R_Key', function() {
      clearInterval(currentPlayer.intervalHandler);
      currentPlayer = new TetrisGame();
      currentPlayer.intervalHandler = setInterval(
        function () {
          if (currentPlayer.go()){
            sockets[currentPlayer.id].emit('serverTellPlayerMove', currentPlayer);
          }else{
            clearInterval(currentPlayer.intervalHandler);
          }
        },
        FALLING_TIME
      );
    });

    socket.on('Space_Key', function() {
      currentPlayer.letFall()
      socket.emit('UpdateBlockX', {data : currentPlayer.getBlockX()} );
    });

    socket.on('Shift_Key', function() {
      /*이건 holdable 여부로 안나누는 이유는 클라이언트에서 holdable에 따라서 전송을 막아야 트래픽을 아낄 수 있기 때문이다.
      서버에서 판정하면 클라이언트에서는 계속 shift 키를 누를 때 마다 요청을 보낼 것 이다.*/
      currentPlayer.hold();
      socket.emit('UpdateBlock', currentPlayer.Block, {data : game.getHoldable()});
    });

    socket.on('Enter_Key', function() {

      if(currentPlayer.getisPause()){
        currentPlayer.setIsPause(false);
        currentPlayer.intervalHandler = setInterval(
          function () {
            if (currentPlayer.go()){
              sockets[currentPlayer.id].emit('serverTellPlayerMove', currentPlayer);
            }else{
              clearInterval(currentPlayer.intervalHandler);
            }
          },
          FALLING_TIME
        );
      }else{
        clearInterval(currentPlayer.intervalHandler);
        currentPlayer.setIsPause(true);
        socket.emit('UpdateIsPause', {data : currentPlayer.getisPause()});
      }

    });
});


//아이피 설정을 어떻게 해야할지 모르겠다.
http.listen( 3000, '127.0.0.1', function() {
    console.log('[DEBUG] Listening on 127.0.0.1 : 3000');
});
