var io = require('socket.io-client');
var global = require('./global');
var canvas = require('./canvas');

var socket;

window.onload = function() {
  if (!socket) {
    socket = io({
      query: "type=tetris"
    });
    setupSocket(socket);
  }
  socket.emit('respawn');
};

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
    socket.emit('gotit');
    canvas.emit('redraw',playerSettings) ;
  });

  socket.on('playerJoin', function(data) {
    console.log('connected in server ' + data.name);
    canvas.emit('socketInit',socket);
  });

  socket.on('playerDisconnect', function(data) {
    console.log(data.name + ' : Disconnected in server');
  });

  canvas.on('Key_Pressed',function(key){
    socket.emit('Key_Pressed',key);
  });

  // 이 부분도 canvas 모듈에 넘겨주어야 한다.
  socket.on('UpdateIsPause', function(pauseData) {
    canvas.emit('UpdateIsPause',pauseData);
  });

  socket.on('serverTellPlayerMove', function(playerSettings) {
    canvas.emit('redraw',playerSettings) ;
    //canvas.emit('drawOtherUsers',playerSettings) ;
  });

  socket.on('users', function(users) {
    canvas.emit('drawUsers',users) ;
  });

}
