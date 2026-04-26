// backend/lib/emitter.js — Shared socket emitter
// ให้ handlers ที่ไม่รับ io ตรงๆ สามารถ emit ไปหา user ได้
// ใช้งาน: emitToUser(uid, event, data)

let _io         = null;
let _userSockets = null;

function setIO(io, userSockets) {
  _io          = io;
  _userSockets = userSockets;
}

function emitToUser(uid, event, data) {
  if (!_io || !_userSockets) return;
  const socketId = _userSockets.get(uid);
  if (socketId) _io.to(socketId).emit(event, data);
}

// Broadcast to ALL connected authenticated game clients
function broadcastAll(event, data) {
  if (!_io) return;
  _io.emit(event, data);
}

module.exports = { setIO, emitToUser, broadcastAll };
