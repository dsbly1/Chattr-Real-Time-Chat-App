module.exports = (io) => {
  const rooms = {};

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    socket.on('join_room', ({ username, room }) => {
      socket.join(room);
      if (!rooms[room]) rooms[room] = {};
      rooms[room][socket.id] = username;
      socket.data.username = username;
      socket.data.room = room;
      io.to(room).emit('user_joined', {
        username,
        message: `${username} joined the room`,
        timestamp: new Date().toISOString(),
        users: Object.values(rooms[room])
      });
    });

    socket.on('send_message', ({ room, message }) => {
      const username = socket.data.username;
      io.to(room).emit('receive_message', {
        username,
        message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing', ({ room, isTyping }) => {
      socket.to(room).emit('user_typing', {
        username: socket.data.username,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      const { username, room } = socket.data;
      if (room && rooms[room]) {
        delete rooms[room][socket.id];
        io.to(room).emit('user_left', {
          username,
          message: `${username} left the room`,
          users: Object.values(rooms[room])
        });
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
