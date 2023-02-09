require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const harperSaveMessage = require('./services/harper-save-message');
const harperGetMessages = require('./services/harper-get-messages');
const leaveRoom = require('./utils/leave-room'); // Add this

// Auth code
const {hashSync, compareSync} = require('bcrypt')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const UserModel = require('./database.js')
    require('./passport.js')
app.use(passport.initialize())
app.use(express.json())
app.use(express.urlencoded({ extended : true}))

// Deploy
const path = require("path")
app.use(express.static(path.join(__dirname + "/public")))


app.use(cors()); // Add cors middleware

// const clientUrl = process.env.REACT_APP_BASE_URL;

const server = http.createServer(app); // Add this

app.get('/*', (request, response) => {
    response.sendFile(path.join(__dirname, '../server/public/index.html'));
})

app.post('/register', (req,res) => {
    const user = new UserModel({
        username: req.body.username,
        emai: req.body.email,
        password: hashSync(req.body.password, 10)
    })


    user.save().then(user => {
        res.send({
            success : true,
            message : "user created success",
            user : {
                id : user._id,
                username : user.username
            }
        })
        }).catch( err => {
            res.send({
                success : false,
                message : "user not created ",
                error : err
            })
        })
    })


app.post('/login', (req,res) => {
    UserModel.findOne({ username : req.body.username}).then(user => {
        if(!user) {
            return res.status(401).send({
                success : false,
                message : 'Could  not find user'
            })
        }


        if(!compareSync(req.body.password, user.password)) {
            return res.status(401).send({
                success : false,
                message : 'Incorrect password'
            })
        }

        const payload =  {
            username : user.username,
            id : user._id
        }
        const token = jwt.sign(payload, "Random string", {expiresIn : "1d"} )


        return res.status(200).send({
            success : true,
            message : 'login success',
            token : "Bearer " + token 

        })

    })
}) 



app.get('/protected', passport.authenticate('jwt', {session : false}) ,   (req, res) => { 
        return res.status(200).send({
            success : true,
            user : {
                id : req.user._id,
                username : req.user.username
            }     
        })
})


// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
 const dbUrl = "https://klenty-noormd.harperdbcloud.com"
const dbPw = "Basic a2xlbnR5Om5DNGxiTGUvNFsyVg=="
const io = new Server(server, {
  cors: {
    // origin: 'http://localhost:3000',
    // origin: clientUrl,
    origin: 'https://klenty-inc.onrender.com/',
    methods: ['GET', 'POST'],
  },
});

const CHAT_BOT = 'ChatBot';
let chatRoom = ''; // E.g. javascript, node,...
let allUsers = []; // All users in current chat room

// Listen for when the client connects via socket.io-client
io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);

  // Add a user to a room
  socket.on('join_room', (data) => {
    const { username, room } = data; // Data sent from client when join_room event emitted
    socket.join(room); // Join the user to a socket room

    let __createdtime__ = Date.now(); // Current timestamp
    // Send message to all users currently in the room, apart from the user that just joined
    socket.to(room).emit('receive_message', {
      message: `${username} has joined the chat room`,
      username: CHAT_BOT,
      __createdtime__,
    });
    // Send welcome msg to user that just joined chat only
    socket.emit('receive_message', {
      message: `Welcome ${username}`,
      username: CHAT_BOT,
      __createdtime__,
    });
    // Save the new user to the room
    chatRoom = room;
    allUsers.push({ id: socket.id, username, room });
    chatRoomUsers = allUsers.filter((user) => user.room === room);
    socket.to(room).emit('chatroom_users', chatRoomUsers);
    socket.emit('chatroom_users', chatRoomUsers);

    // Get last 100 messages sent in the chat room
    harperGetMessages(room)
      .then((last100Messages) => {
        // console.log('latest messages', last100Messages);
        socket.emit('last_100_messages', last100Messages);
      })
      .catch((err) => console.log(err));
  });

  socket.on('send_message', (data) => {
    const { message, username, room, __createdtime__ } = data;
    io.in(room).emit('receive_message', data); // Send to all users in room, including sender
    harperSaveMessage(message, username, room, __createdtime__) // Save message in db
      .then((response) => console.log(response))
          .catch((err) => console.log('from index.js', err));
  });

  socket.on('leave_room', (data) => {
    const { username, room } = data;
    socket.leave(room);
    const __createdtime__ = Date.now();
    // Remove user from memory
    allUsers = leaveRoom(socket.id, allUsers);
    socket.to(room).emit('chatroom_users', allUsers);
    socket.to(room).emit('receive_message', {
      username: CHAT_BOT,
      message: `${username} has left the chat`,
      __createdtime__,
    });
    console.log(`${username} has left the chat`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from the chat');
    const user = allUsers.find((user) => user.id == socket.id);
    if (user?.username) {
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(chatRoom).emit('chatroom_users', allUsers);
      socket.to(chatRoom).emit('receive_message', {
        message: `${user.username} has disconnected from the chat.`,
      });
    }
  });
});

const port = process.env.PORT || 4000

server.listen(port, () => 'Server is running on port 4000');
