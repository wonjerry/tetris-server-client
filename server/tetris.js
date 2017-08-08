var global = require('./../client/global');

function Shape() {
  this.BLOCKS = [
    [
      [0, 0, 0, 0],
      [0, 11, 11, 0],
      [0, 11, 11, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 12, 0],
      [0, 0, 12, 0],
      [0, 0, 12, 0],
      [0, 0, 12, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 13, 13, 0],
      [0, 0, 13, 13],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 14, 14],
      [0, 14, 14, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 15, 0],
      [0, 15, 15, 0],
      [0, 0, 15, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 16, 0, 0],
      [0, 16, 0, 0],
      [0, 16, 16, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 17, 0],
      [0, 0, 17, 0],
      [0, 17, 17, 0],
      [0, 0, 0, 0],
    ]
  ];
  this.X = 3;
  this.Y = 0;
  this.currentBlock = this.randomBlock();
  this.nextBlock = this.randomBlock();
  this.holdBlock = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
}

Shape.prototype.rotateRight = function(block) {
  return [
    [block[3][0], block[2][0], block[1][0], block[0][0]],
    [block[3][1], block[2][1], block[1][1], block[0][1]],
    [block[3][2], block[2][2], block[1][2], block[0][2]],
    [block[3][3], block[2][3], block[1][3], block[0][3]]
  ];
}

Shape.prototype.rotateLeft = function(block) {
  return [
    [block[0][3], block[1][3], block[2][3], block[3][3]],
    [block[0][2], block[1][2], block[2][2], block[3][2]],
    [block[0][1], block[1][1], block[2][1], block[3][1]],
    [block[0][0], block[1][0], block[2][0], block[3][0]]
  ];
}

Shape.prototype.intersectCheck = function(y, x, block, board) {
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (block[i][j]) {
        if (i + y >= global.BOARD_HEIGHT || j + x >= global.BOARD_WIDTH || j + x < 0 || board[y + i][x + j]) {
          return true; /* 움직였을 때 어떤 물체 또는 board 끝에 겹침을 뜻함*/
        }
      }
    }
  }
  return false;
}

Shape.prototype.applyBlock = function(y, x, block, board) {
  var newBoard = [];

  for (var i = 0; i < global.BOARD_HEIGHT; i++) {
    newBoard[i] = board[i].slice();
  }

  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (block[i][j]) {
        newBoard[i + y][j + x] = block[i][j];
      }
    }
  }
  return newBoard;
}

Shape.prototype.deleteLine = function(board) {
  var newBoard = [];
  var count = global.BOARD_HEIGHT;
  for (var i = global.BOARD_HEIGHT; i-- > 0;) {
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      if (!board[i][j]) { /* 0인 성분이 있으면 한줄이 다 안 채워진 것이므로 붙여넣기 해 준다.*/
        /*--count로 아래부터 새로운 board를 채워주는 이유는 맨 아래줄부터 1로 채워진 줄이 있다면 자동적으로
        새로운 board에는 추가되지 않기 때문이다. 이 이후에 맨위부터 count까지는 0으로 채워 주어야 한다.*/
        newBoard[--count] = board[i].slice();
        break;
      }
    }
  }

  for (var i = 0; i < count; i++) {
    newBoard[i] = [];
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      newBoard[i][j] = 0;
    }
  }

  return {
    'board': newBoard,
    'deletedLineCount': count
  };
}

Shape.prototype.randomBlock = function() {
  return this.BLOCKS[Math.floor(Math.random() * this.BLOCKS.length)];
}

Shape.prototype.clone = function(origin, target) {
  for (var i = 0; i < 4; i++) {
    target[i] = origin[i].slice();
  }
}

Shape.prototype.emptyCheck = function(block) {
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (block[i][j]) return false;
    }
  }

  return true;
}


/*전체적으로 게임을 진행시키기 위한 데이터와 메소드를 담고있는 객체*/
function TetrisGame() {

  this.intervalHandler = -1;

  this.isGameOver = false;
  this.isPause = false;
  this.holdable = true;

  this.block = new Shape();

  this.startX = 0;
  this.score = 0;
  /*id는 각 클라이언트 소켓에 할당된 id로 지정한다.*/
  this.id = -1;

  this.board = [];

  for (var i = 0; i < global.BOARD_HEIGHT; i++) {
    this.board[i] = [];
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
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
  if (this.getisGameover()) {
    return false;
  }

  if (this.block.intersectCheck(this.block.Y + 1, this.block.X, this.block.currentBlock, this.board)) {
    this.board = this.block.applyBlock(this.block.Y, this.block.X, this.block.currentBlock, this.board);
    var r = this.block.deleteLine(this.board);
    this.board = r.board;
    this.score += r.deletedLineCount * r.deletedLineCount * 10;
    this.setHoldable(true);
    if (this.block.intersectCheck(0, 3, this.block.nextBlock, this.board)) {
      this.setIsGameover(true);
    } else {
      this.block.currentBlock = this.block.nextBlock;
      this.block.nextBlock = this.block.randomBlock();
      this.block.X = 3;
      this.block.Y = 0;
    }
  } else {
    this.block.Y += 1;

  }
  return true;
}

TetrisGame.prototype.steerLeft = function() {
  if (!this.block.intersectCheck(this.block.Y, this.block.X - 1, this.block.currentBlock, this.board)) {
    this.block.X -= 1;
    return true;
  }
  return false;
}

TetrisGame.prototype.steerRight = function() {
  if (!this.block.intersectCheck(this.block.Y, this.block.X + 1, this.block.currentBlock, this.board)) {
    this.block.X += 1;
    return true;
  }
  return false;
}

TetrisGame.prototype.steerDown = function() {
  if (!this.block.intersectCheck(this.block.Y + 1, this.block.X, this.block.currentBlock, this.board)) {
    this.block.Y += 1;
    return true;
  }
  return false;
}

TetrisGame.prototype.rotateLeft = function() {
  var newBlock = this.block.rotateLeft(this.block.currentBlock);
  if (!this.block.intersectCheck(this.block.Y, this.block.X, newBlock, this.board)) {
    this.block.currentBlock = newBlock;
    return true;
  }
  return false;
}

TetrisGame.prototype.rotateRight = function() {
  var newBlock = this.block.rotateRight(this.block.currentBlock);
  if (!this.block.intersectCheck(this.block.Y, this.block.X, newBlock, this.board)) {
    this.block.currentBlock = newBlock;
    return true;
  }
  return false;
}

TetrisGame.prototype.letFall = function() {
  while (!this.block.intersectCheck(this.block.Y + 1, this.block.X, this.block.currentBlock, this.board)) {
    this.block.Y += 1;
  }
  this.go();
}

TetrisGame.prototype.hold = function() {
  this.holdable = false;
  /* hold블록이 비어있으면 currentBlock에 nextblock을 넣어줘야 한다.*/
  if (this.block.emptyCheck(this.block.holdBlock)) {
    this.block.clone(this.block.currentBlock, this.block.holdBlock);
    this.block.clone(this.block.nextBlock, this.block.currentBlock);
    this.block.nextBlock = this.block.randomBlock();
  } else {
    var temp = [];
    for (var i = 0; i < 4; i++) {
      temp[i] = [];
    }

    this.block.clone(this.block.holdBlock, temp);
    this.block.clone(this.block.currentBlock, this.block.holdBlock);
    this.block.clone(temp, this.block.currentBlock);

  }

  this.block.X = 3;
  this.block.Y = 0;

}

TetrisGame.prototype.getIntervalHandler = function() {
  return this.intervalHandler;
}

TetrisGame.prototype.setIntervalHandler = function(ih) {
  this.intervalHandler = ih;
}

TetrisGame.prototype.getId = function() {
  return this.id;
}

TetrisGame.prototype.setId = function(id) {
  this.id = id;
}

TetrisGame.prototype.getId = function() {
  return this.id;
}

TetrisGame.prototype.setStartX = function(sx) {
  this.startX = sx;
}

TetrisGame.prototype.getStartX = function() {
  return this.startX;
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
  return this.block.applyBlock(this.block.Y, this.block.X, this.block.currentBlock, this.board);
}

TetrisGame.prototype.getGameData = function() {
  return {
    id: this.id,
    startX: this.startX,
    isGameOver: this.getisGameover(),
    isPause: this.getisPause(),
    holdable: this.getHoldable(),
    score: this.getScore(),
    X: this.block.X,
    Y: this.block.Y,
    currentBlock: this.getCurrentBlock(),
    nextBlock: this.getNextBlock(),
    holdBlock: this.getHoldBlock(),
    board: this.getBoard()
  };
}

module.exports = TetrisGame;
