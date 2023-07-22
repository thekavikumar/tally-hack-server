const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const activeRooms = {};

function createRoom(roomName) {
  if (!activeRooms[roomName]) {
    activeRooms[roomName] = {
      users: {}, // Object to store connected users in the room
    };
    return true;
  } else {
    return false;
  }
}
function joinRoom(socket, roomName) {
  if (activeRooms[roomName]) {
    socket.join(roomName);
    activeRooms[roomName].users[socket.id] = {
      username: "", // You can set the username later when the user sends their username
    };
    socket.emit("roomJoined", roomName);
    emitUserList(roomName); // Emit the user list to all clients in the room
    socket.to(roomName).emit("userJoined", socket.id); // Emit "userJoined" event to other clients in the room
  } else {
    socket.emit("roomNotFound");
  }
}

function emitUserList(roomName) {
  if (activeRooms[roomName]) {
    io.to(roomName).emit("userList", Object.keys(activeRooms[roomName].users));
  }
}

io.on("connection", (socket) => {
  console.log("User connected");
  socket.emit("userId", socket.id);
  socket.on("createRoom", (roomName) => {
    // Call the createRoom function and check if room creation was successful
    const isRoomCreated = createRoom(roomName);

    if (isRoomCreated) {
      socket.join(roomName);
      activeRooms[roomName][socket.id] = {
        username: "", // You can set the username later when the user sends their username
      };
      socket.emit("roomCreated", roomName);
      emitUserList(roomName); // Emit the user list to all clients in the room
      // Emit "roomCreated" event to the client
    } else {
      socket.emit("roomAlreadyExists"); // Emit "roomAlreadyExists" event if the room already exists
    }
  });

  socket.on("joinRoom", (roomName) => {
    joinRoom(socket, roomName);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Remove the disconnected user from all active rooms
    for (const roomName in activeRooms) {
      if (activeRooms[roomName].users[socket.id]) {
        delete activeRooms[roomName].users[socket.id];
        emitUserList(roomName); // Emit the updated user list to all clients in the room
      }
    }
  });
});

server.listen(8000);
