const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidV4 } = require('uuid');

const port = 8080;

const dotenv = require('dotenv')
dotenv.config()

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true })

const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log('Connected to mongoose database'))

app.use(express.static('public'));
app.set('view engine', 'ejs');

const server = http.createServer(app);
const io = socketIO(server);

//const middleware = require('./middleware/middleware');
let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());

const BuildRoute = require('./routes/build')
app.use('/api', BuildRoute)


//const joinRoute = require('./routes/joinquiz');
//app.use('/api')

// { code: 342555, quiz: eisfeskdfeisfls }  quiz being a uuid generated string for url

function deleteByValue(map, valueToDelete) {
    for (const [key, value] of map.entries()) {
      if (value === valueToDelete) {
        map.delete(key);
      }
    }
  }

let quizCodes = new Map();
let quizzes = {};

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/join', (req, res) => {
    const code = req.body.code;
    const redirect = quizCodes.get(Number(code));
    console.log(quizCodes)

    console.log(code);
    console.log(redirect);
    
    if (redirect) {
        res.json({ redirect })
    }
    else {
        res.json( { message: "Invalid Code"} )
    }
});

app.post('/create', (req, res) => {
    const quizID = req.body.quizID;

    function generateUniqueNumber() {
        let randomNumber;
        do {
            randomNumber = Math.floor(Math.random() * 900000) + 100000;
        } while (quizzes[randomNumber]);

        return randomNumber;
    }

    var code = generateUniqueNumber();

    console.log(code)
    var uuid = uuidV4();

    quizCodes.set(code, uuid);

    quizzes[uuid] = {
        joinCode: code,
        quizID: quizID,
        waiting: true
    }

    console.log(quizzes[uuid])

    res.json({code, uuid});
});

app.get('/:quiz', (req, res) => {
    const roomId = req.params.quiz;
    const codeToCheck = Number(req.query.code);
    console.log(codeToCheck);

    if (quizCodes.get(codeToCheck) == roomId) {
        if (quizzes[roomId].waiting) {
            res.render('waiting', { roomId: roomId, quizCode: codeToCheck });
        }
        else {
            res.render('quiz', { roomId: roomId, quizCode: codeToCheck })
        }
    }
    else {
        res.render('invalid')
    }
});

const Player = require('./classes/player');

io.on('connection', (socket) => {
    console.log('connection')

    socket.on('connectQuiz', (roomId) => {
        socket.join(roomId);
        // Once connected generate a uuid and a player obj for the client and add it to the dictionary.
        const uuid = uuidV4();
        const player = new Player(uuid);

        player.name = player.generateName();

        if (!quizzes[roomId].players) {
            quizzes[roomId].players = [];
        }
        quizzes[roomId].players.push(player);

        // Emit events to the connected client and all clients in the room
        socket.emit('uuid', uuid);
        io.to(roomId).emit('updatePlayers', quizzes[roomId].players);

        socket.on('ready', (user) => {
            const foundPlayer = quizzes[roomId].players.find(player => player.uuid === user);
            foundPlayer.toggleReady();
            io.to(roomId).emit('updatePlayers', quizzes[roomId].players);

            const allPlayersReady = quizzes[roomId].players.every(player => player.ready);

            if (allPlayersReady) {
                console.log('All players are ready!');
                io.to(roomId).emit('startGame');
                quizzes[roomId].waiting = false;
                console.log(quizzes[roomId])
            }

        })

        socket.on('disconnect', () => {
            const playerIndex = quizzes[roomId].players.findIndex(player => player.uuid === uuid);
            if (playerIndex !== -1) {
                quizzes[roomId].players.splice(playerIndex, 1);
                io.to(roomId).emit('updatePlayers', quizzes[roomId].players);
            }

            if (!quizzes[roomId].players || quizzes[roomId].players.length === 0) {
                delete quizzes[roomId];
                deleteByValue(quizCodes, roomId);
            }
        });
    });
});

server.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
});

