
var io = require('socket.io-client');
var socket;
var game;

function tetris_run() {
  if (!socket) {
      socket = io({query:"type=" + type});
      setupSocket(socket);
  }

  socket.emit('respawn');
}

// socket stuff.
function setupSocket(socket) {

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
        game = playerSettings;
        socket.emit('gotit', game);
    });

    socket.on('playerJoin', function (data) {
        console.log('connected in server');
    });

    socket.on('playerDisconnect', function (data) {
        console.log( data.name + ' : Disconnected in server');
    });

}

function keyPressed(){
  var mustpause = false;
  if(game.getisPause()){
    if(keyCode === ENTER){
      socket.emit('Enter_Key');
    }else if(key === 'R'){
      socket.emit('R_Key');
    }
  }else{
    if(keyCode === ENTER){
      mustpause = true;
    }else if(key === 'R'){
      socket.emit('R_Key');
    }else if(key === 'A'){
      socket.emit('A_Key');
    }else if(key === 'S'){
      socket.emit('S_Key');
    }else if(keyCode === KEY_SPACE){/*space bar*/
      socket.emit('Space_Key');
    }else if(keyCode === KEY_SHIFT){/*shift*/
      if(game.getHoldable()){
        socket.emit('Shift_Key');
      }
    }else if(keyCode === LEFT_ARROW){
      socket.emit('Left_Key');
    }else if(keyCode === RIGHT_ARROW){
      socket.emit('Right_Key');
    }else if(keyCode === DOWN_ARROW){
      socket.emit('Down_Key');
    }else if(keyCode === UP_ARROW){
      socket.emit('Up_Key');
    }

    if (mustpause) {
      socket.emit('Enter_Key');
    }
    redraw();

  }
}

/*************여기서 부터는 게임 화면을 그리는 부분이다.****************혀/

/*P5.js의 메소드 이다. 프로그램이 실행 되기전 전처리를 맡는다.*/
function setup() {
  createCanvas(1500, 850);
  textSize(20);
  noLoop();
  tetris_run();
}

/*P5.js의 메소드 이다. redraw()에 의해 반복적으로 호출되어 게임 화면을 현재 상태에 맞게 그려준다.*/

function draw(){
    clear();
    draw_nextBlock(game.getNextBlock(),game.startX,0);
    draw_holdBlock(game.getHoldBlock(),game.startX,0);
    draw_tetrisBoard(game.getBoard(),game.startX,0);
    draw_score(game.getScore(),game.startX,0);
    draw_state(game.getisPause(),game.getisGameover(),game.startX,0);
}

function draw_tetrisBoard(board,Sx,Sy){
  draw_block(board,BOARD_HEIGHT,BOARD_WIDTH,0+Sx,170+Sy);
}

function draw_block(board, rowNum, colNum ,Sx,Sy){
   for(var i = 0; i < rowNum; i++){
    for(var j = 0; j < colNum; j++){
      /*뭔가 for문안에서 push pop이 발생하니 느릴 것 같다.*/
      push();
      translate(Sx + j*BLOCK_WIDTH ,Sy + i*BLOCK_HEIGHT);
      var colorType = '#000000';
      switch (board[i][j]) {
        case 11:
          colorType = '#ed0345';
          break;
        case 12:
          colorType = '#ef6a32';
          break;
        case 13:
          colorType = '#fbbf45';
          break;
        case 14:
          colorType = '#aad962';
          break;
        case 15:
          colorType = '#03c383';
          break;
        case 16:
          colorType = '#017351';
          break;
        case 17:
          colorType = '#a12a5e';
          break;
      }
      fill(color(colorType));/*black*/
      rect(0,0,BLOCK_WIDTH,BLOCK_HEIGHT);
      pop();
    }
  }
}

function draw_nextBlock(board,Sx,Sy){
  push();
  translate(0 + Sx,0 + Sy);
  text("Next Block", 0, 20);
  pop();
  draw_block(board,4,4,0+Sx,30+Sy);
}

function draw_holdBlock(board,Sx,Sy){
  push();
  translate(180+Sx,0+Sy);
  text("Hold Block", 0, 20);
  pop();
  draw_block(board,4,4,180+Sx,30+Sy);

}

function draw_score(score,Sx,Sy){
  var str = "SCORE";
  push();
  translate(0+Sx,790+Sy);
  rect(0, 0, 120, 50);
  text(str, 10, 20);
  text(score, 10, 45);
  pop();
}

function draw_state(isPaused, isGameOver,Sx,Sy){
  push();
  translate(180+Sx,790+Sy);
  rect(0, 0, 120, 50);

  if(isGameOver){
    text("GAME OVER", 10, 35);
    pop();
    return;
  }

  if(isPaused){
    text("PAUSED", 25, 35);
  }
  pop();
}

function draw_keys(){
  push();
  translate(0,400);
  text("keys", 20, 20);

  text("Cursor Keys : Steer", 20, 60);
  text("a/s/up key : Rotate", 20, 80);
  text("Space bar : Let fall", 20, 100);
  text("shift : hold block", 20, 120);
  text("Enter : Toggle pause", 20, 140);
  text("r : Restart game", 20, 160);
  pop();
}
