var io = require('socket.io-client');
var global = require('./global');
var socket;
var game = {};
var p5Object;

function tetris_run() {
  // 위치 지정을 위한 처리도 해 주어야 한다.
  if (!socket) {
    socket = io({
      query: "type=tetris"
    });
    setupSocket(socket);
  }
  socket.emit('respawn');
}

// socket stuff.
function setupSocket(socket) {

  // Handle error.
  socket.on('connect_failed', function() {
    socket.close();
    global.disconnected = true;
  });

  socket.on('disconnect', function() {
    socket.close();
    global.disconnected = true;
  });

  // Handle connection.
  socket.on('welcome', function(playerSettings) {
    game.startX = playerSettings.startX;
    game.isGameOver = playerSettings.isGameOver;
    game.isPause = playerSettings.isPause;
    game.holdable = playerSettings.holdable;
    game.score = playerSettings.score;
    game.X = playerSettings.X;
    game.Y = playerSettings.Y;
    game.currentBlock = [];
    for (var i = 0; i < 4; i++) {
      game.currentBlock[i] = playerSettings.currentBlock[i].slice();
    }
    game.nextBlock = [];
    for (var i = 0; i < 4; i++) {
      game.nextBlock[i] = playerSettings.nextBlock[i].slice();
    }
    game.holdBlock = [];
    for (var i = 0; i < 4; i++) {
      game.holdBlock[i] = playerSettings.holdBlock[i].slice();
    }
    game.board = [];
    for (var i = 0; i < global.BOARD_HEIGHT; i++) {
      game.board[i] = playerSettings.board[i].slice();
    }
    socket.emit('gotit');
  });

  socket.on('playerJoin', function(data) {
    console.log('connected in server');
  });

  socket.on('playerDisconnect', function(data) {
    console.log(data.name + ' : Disconnected in server');
  });

  socket.on('UpdateCurrentBlock', function(blockData) {
    game.currentBlock = [];
    for (var i = 0; i < 4; i++) {
      game.currentBlock[i] = blockData.data[i].slice();
    }
    console.log(blockData.data);
    console.log(game.currentBlock);
    p5Object.redraw();
  });

  socket.on('UpdateBlockY', function(blockData) {
    game.Y = blockData.data;
    p5Object.redraw();
  });

  socket.on('UpdateBlockX', function(blockData) {
    game.X = blockData.data;
    p5Object.redraw();
  });

  socket.on('UpdateBlock', function(blockObject, holdable) {
    game.block = blockData;
    game.setHoldable(holdable.data);
    p5Object.redraw();
  });

  socket.on('UpdateIsPause', function(pauseData) {
    game.isPause = pauseData.data;
    p5Object.redraw();
  });

  socket.on('serverTellPlayerMove', function(playerSettings) {

    game.startX = playerSettings.startX;
    game.isGameOver = playerSettings.isGameOver;
    game.isPause = playerSettings.isPause;
    game.holdable = playerSettings.holdable;
    game.score = playerSettings.score;
    game.X = playerSettings.X;
    game.Y = playerSettings.Y;

    game.currentBlock = [];
    for (var i = 0; i < 4; i++) {
      game.currentBlock[i] = playerSettings.currentBlock[i].slice();
    }

    game.nextBlock = [];
    for (var i = 0; i < 4; i++) {
      game.nextBlock[i] = playerSettings.nextBlock[i].slice();
    }

    game.holdBlock = [];
    for (var i = 0; i < 4; i++) {
      game.holdBlock[i] = playerSettings.holdBlock[i].slice();
    }

    game.board = [];
    for (var i = 0; i < global.BOARD_HEIGHT; i++) {
      game.board[i] = playerSettings.board[i].slice();
    }

    p5Object.redraw();
  });

  socket.on('otherUsers', function(pauseData) {
    game.isPause = pauseData.data;
    p5Object.redraw();
  });

}

function draw_tetrisGame() {
  if (game.score == undefined) {
    console.log(game);
    return;
  }
  draw_nextBlock(game.nextBlock, game.startX, 0);
  draw_holdBlock(game.holdBlock, game.startX, 0);
  draw_tetrisBoard(game.board, game.startX, 0);
  draw_score(game.score, game.startX, 0);
  draw_state(game.isPause, game.isGameOver, game.startX, 0);
}

function draw_tetrisBoard(board, Sx, Sy) {
  draw_block(board, global.BOARD_HEIGHT, global.BOARD_WIDTH, 0 + Sx, 170 + Sy);
}

function draw_block(board, rowNum, colNum, Sx, Sy) {
  for (var i = 0; i < rowNum; i++) {
    for (var j = 0; j < colNum; j++) {
      /*뭔가 for문안에서 push pop이 발생하니 느릴 것 같다.*/
      p5Object.push();
      p5Object.translate(Sx + j * global.BLOCK_WIDTH, Sy + i * global.BLOCK_HEIGHT);
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
      p5Object.fill(p5Object.color(colorType)); /*black*/
      p5Object.rect(0, 0, global.BLOCK_WIDTH, global.BLOCK_HEIGHT);
      p5Object.pop();
    }
  }
}

function draw_nextBlock(board, Sx, Sy) {
  p5Object.push();
  p5Object.translate(0 + Sx, 0 + Sy);
  p5Object.text("Next Block", 0, 20);
  p5Object.pop();
  draw_block(board, 4, 4, 0 + Sx, 30 + Sy);
}

function draw_holdBlock(board, Sx, Sy) {
  p5Object.push();
  p5Object.translate(180 + Sx, 0 + Sy);
  p5Object.text("Hold Block", 0, 20);
  p5Object.pop();
  draw_block(board, 4, 4, 180 + Sx, 30 + Sy);

}

function draw_score(score, Sx, Sy) {
  var str = "SCORE";
  p5Object.push();
  p5Object.translate(0 + Sx, 790 + Sy);
  p5Object.rect(0, 0, 120, 50);
  p5Object.text(str, 10, 20);
  p5Object.text(score || 0, 10, 45);
  p5Object.pop();
}

function draw_state(isPaused, isGameOver, Sx, Sy) {
  p5Object.push();
  p5Object.translate(180 + Sx, 790 + Sy);
  p5Object.rect(0, 0, 120, 50);

  if (isGameOver) {
    p5Object.text("GAME OVER", 10, 35);
    p5Object.pop();
    return;
  }

  if (isPaused) {
    p5Object.text("PAUSED", 25, 35);
  }
  p5Object.pop();
}

var p5sketch = function(p) {
  p5Object = p;
  p.setup = function() {
    p.createCanvas(1500, 850);
    p.textSize(20);
    p.noLoop();
    tetris_run();
  }
  p.draw = function() {
    p.clear();
    draw_tetrisGame();
  }
  p.keyPressed = function() {
    var str = '';

    if (game.isPause) {
      if (p.keyCode === p.ENTER) {
        str = 'Enter_Key';
      } else if (p.key === 'R') {
        str = 'R_Key';
      }else str = 'none';
    } else {
      if (p.keyCode === p.ENTER) {
        str = 'Enter_Key';
      } else if (p.key === 'R') {
        str = 'R_Key';
      } else if (p.key === 'A') {
        str = 'A_Key';
      } else if (p.key === 'S') {
        str = 'S_Key';
      } else if (p.keyCode === global.KEY_SPACE) { /*space bar*/
        str = 'Space_Key';
      } else if (p.keyCode === global.KEY_SHIFT) { /*shift*/
        // hold 할 수 없으면 전송하지 않는다.
        if (game.holdable) {
          str = 'Shift_Key';
        }
      } else if (p.keyCode === p.LEFT_ARROW) {
        str = 'Left_Key';
      } else if (p.keyCode === p.RIGHT_ARROW) {
        str = 'Right_Key';
      } else if (p.keyCode === p.DOWN_ARROW) {
        str =  'Down_Key';
      } else if (p.keyCode === p.UP_ARROW) {
        str = 'Up_Key';
      }else str = 'none';
    }

    if(str !== 'none') socket.emit('Key_Pressed',{data : str});
    p.redraw();
  }

  
}

new p5(p5sketch, 'myp5sketch');
