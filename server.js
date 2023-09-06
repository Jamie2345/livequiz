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
let quizes = {};


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
    function generateUniqueNumber() {
        let randomNumber;
        do {
            randomNumber = Math.floor(Math.random() * 900000) + 100000;
        } while (quizCodes.get(randomNumber));

        return randomNumber;
    }

    var code = generateUniqueNumber();
    var uuid = uuidV4();

    quizCodes.set(code, uuid);

    res.json({ code, uuid })
});

app.get('/:quiz', (req, res) => {
    const quizId = req.params.quiz;
    const codeToCheck = Number(req.query.code);

    if (quizCodes.get(codeToCheck) == quizId) {
        res.render('waiting', { quizId: quizId, quizCode: codeToCheck });
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

        if (!quizes[roomId]) {
            quizes[roomId] = {
                players: [],
            };
        }

        quizes[roomId].players.push(player);

        // Emit events to the connected client and all clients in the room
        socket.emit('uuid', uuid);
        io.to(roomId).emit('updatePlayers', quizes[roomId].players);

        socket.on('ready', (user) => {
            const foundPlayer = quizes[roomId].players.find(player => player.uuid === user);
            foundPlayer.toggleReady();
            io.to(roomId).emit('updatePlayers', quizes[roomId].players);

            const allPlayersReady = quizes[roomId].players.every(player => player.ready);

            if (allPlayersReady) {
                console.log('All players are ready!');
                io.to(roomId).emit('startGame', quizes[roomId].players);
            }

        })

        socket.on('disconnect', () => {
            const playerIndex = quizes[roomId].players.findIndex(player => player.uuid === uuid);
            if (playerIndex !== -1) {
                quizes[roomId].players.splice(playerIndex, 1);
                io.to(roomId).emit('updatePlayers', quizes[roomId].players);
            }

            if (!quizes[roomId].players || quizes[roomId].players.length === 0) {
                delete quizes[roomId];
                deleteByValue(quizCodes, roomId);
            }
        });
    });
});

server.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
});

