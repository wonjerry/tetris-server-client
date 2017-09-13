var global = require('../../client/src/global');
var SeedRandom = require('seedrandom');

function Shape(randomSeed) {
    var self = this;

    if (!(self instanceof Shape)) return new Shape(randomSeed);

    self.BLOCKS = [
        [
            [0, 0, 0, 0],
            [0, 11, 11, 0],
            [0, 11, 11, 0],
            [0, 0, 0, 0]
        ],
        [
            [0, 0, 12, 0],
            [0, 0, 12, 0],
            [0, 0, 12, 0],
            [0, 0, 12, 0]
        ],
        [
            [0, 0, 0, 0],
            [0, 13, 13, 0],
            [0, 0, 13, 13],
            [0, 0, 0, 0]
        ],
        [
            [0, 0, 0, 0],
            [0, 0, 14, 14],
            [0, 14, 14, 0],
            [0, 0, 0, 0]
        ],
        [
            [0, 0, 15, 0],
            [0, 15, 15, 0],
            [0, 0, 15, 0],
            [0, 0, 0, 0]
        ],
        [
            [0, 16, 0, 0],
            [0, 16, 0, 0],
            [0, 16, 16, 0],
            [0, 0, 0, 0]
        ],
        [
            [0, 0, 17, 0],
            [0, 0, 17, 0],
            [0, 17, 17, 0],
            [0, 0, 0, 0]
        ]
    ];

    self.randomSeed = randomSeed || Date.now();
    self.random = SeedRandom(self.randomSeed);

    self.X = 3;
    self.Y = 0;
    self.currentBlock = self.randomBlock();
    self.nextBlock = self.randomBlock();
    self.holdBlock = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
}

Shape.prototype.rotateRight = function (block) {
    return [
        [block[3][0], block[2][0], block[1][0], block[0][0]],
        [block[3][1], block[2][1], block[1][1], block[0][1]],
        [block[3][2], block[2][2], block[1][2], block[0][2]],
        [block[3][3], block[2][3], block[1][3], block[0][3]]
    ];
};

Shape.prototype.rotateLeft = function (block) {
    return [
        [block[0][3], block[1][3], block[2][3], block[3][3]],
        [block[0][2], block[1][2], block[2][2], block[3][2]],
        [block[0][1], block[1][1], block[2][1], block[3][1]],
        [block[0][0], block[1][0], block[2][0], block[3][0]]
    ];
};

Shape.prototype.intersectCheck = function (y, x, block, board) {
    var self = this;

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            if (block[i][j]) {
                if (i + y >= global.BOARD_HEIGHT || j + x >= global.BOARD_WIDTH || j + x < 0 || board[y + i][x + j]) {
                    return true;
                    /* 움직였을 때 어떤 물체 또는 board 끝에 겹침을 뜻함*/
                }
            }
        }
    }
    return false;
};

Shape.prototype.applyBlock = function (y, x, block, board) {
    var self = this;

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
};

Shape.prototype.deleteLine = function (board) {
    var self = this;

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
};

Shape.prototype.randomBlock = function () {
    var self = this;
    var index = Math.floor(self.random() * self.BLOCKS.length);
    return self.BLOCKS[index];

};

Shape.prototype.clone = function (origin, target) {
    var self = this;

    for (var i = 0; i < 4; i++) {
        target[i] = origin[i].slice();
    }
};

Shape.prototype.emptyCheck = function (block) {
    var self = this;

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            if (block[i][j]) return false;
        }
    }

    return true;
};

module.exports = Shape;