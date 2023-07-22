const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const activeRooms = {};
const userRoomMap = {};
const userUsernameMap = {}; // Object to store the mapping of user socket IDs to usernames

function getUsername(userId) {
  return userUsernameMap[userId];
}

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
    roomId = roomName;
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

function getUserRoom(userId) {
  // Get the room name for the given user ID from the userRoomMap object
  return userRoomMap[userId];
}

io.on("connection", (socket) => {
  let roomId;
  console.log("User connected");
  socket.emit("userId", socket.id);
  socket.on("createRoom", (roomName) => {
    // Call the createRoom function and check if room creation was successful
    const isRoomCreated = createRoom(roomName);

    if (isRoomCreated) {
      socket.join(roomName);
      activeRooms[roomName][socket.id] = {
        username: "", // You can set the username later when the user sends their username
        room: "",
      };
      roomId = roomName;
      socket.emit("roomCreated", roomName);
      emitUserList(roomName); // Emit the user list to all clients in the room
      // Emit "roomCreated" event to the client
    } else {
      socket.emit("roomAlreadyExists"); // Emit "roomAlreadyExists" event if the room already exists
    }
  });

  socket.on("setUsername", (username) => {
    // Set the username for the user and store it in the userUsernameMap
    activeUsers[socket.id].username = username;
    userUsernameMap[socket.id] = username;

    // Emit the userId and username back to the client
    socket.emit("userId", socket.id);
    socket.emit("username", username);
  });

  socket.on("joinRoom", (roomName) => {
    joinRoom(socket, roomName);
  });

  socket.on("progress", (progress) => {
    // Broadcast the progress to all clients in the room
    if (activeRooms[roomId]) {
      io.to(roomId).emit("progress", {
        userId: socket.id,
        progress: progress,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Remove the user from the active room when they disconnect
    if (activeRooms[roomId] && activeRooms[roomId][socket.id]) {
      delete activeRooms[roomId][socket.id];
      // Broadcast the updated user list to all clients in the room
      io.to(roomId).emit("userList", Object.keys(activeRooms[roomId]));
    }
  });
});

server.listen(8000);
