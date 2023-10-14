const express = require('express');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId; // Import ObjectId for ID conversion
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

const Quiz = require('./models/Quiz')

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

const liveQuiz = require('./classes/livequiz');

app.post('/create', (req, res) => {
    const quizName = req.body.quizName;
    console.log(quizName)

    function generateUniqueNumber() {
        let randomNumber;
        do {
            randomNumber = Math.floor(Math.random() * 900000) + 100000;
        } while (quizzes[randomNumber]);

        return randomNumber;
    }

    // write code to verify if this is a valid quizID
    try {
 
        Quiz.findOne({name: quizName})

        .then(foundQuiz => {
            if (foundQuiz) {
                var code = generateUniqueNumber();
                var uuid = uuidV4();

                quizCodes.set(code, uuid);
            
                quizzes[uuid] = {
                    joinCode: code,
                    quizObj: new liveQuiz(foundQuiz),   // change this so instead of the db as parameter it is the entire quiz json
                    players: [],
                    waiting: true
                };
            
                console.log(quizzes[uuid]);
                res.json({ code, uuid });
            }
            else {
                res.json({ message: 'A quiz with that name does not exists' });
            }
        });

    }
    catch (error) {
        console.error('Error checking object existence:', error);
        res.json({ message: 'Error checking object existence' }); // Handle any errors gracefully
    }
    
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

        // generate a new username for the user
        player.name = player.generateName();  // should make a paramater called names in use to prevent duplicates
        quizzes[roomId].players.push(player);

        // Emit events to the connected client and all clients in the room
        socket.emit('uuid', uuid);
        io.to(roomId).emit('updatePlayers', quizzes[roomId].players);

        socket.on('ready', (user) => {
            const foundPlayer = quizzes[roomId].players.find(player => player.uuid === user);
            foundPlayer.toggleReady();
            
            io.to(roomId).emit('updatePlayers', quizzes[roomId].players);  // broadcast a signal to all clients to update players
            

            // if all players have pressed the ready button send a signal to the room to start the game            
            const allPlayersReady = quizzes[roomId].players.every(player => player.ready);
            if (allPlayersReady) {
                io.to(roomId).emit('startGame');
                quizzes[roomId].waiting = false;

                if (!quizzes[roomId].quizObj.isGameOver()) {
                    var quizObj = quizzes[roomId].quizObj;
                    var questionToShow = quizObj.nextQuestion()
                    console.log(questionToShow);
                    // io.to(roomId).emit('showQuestion', quizObj);
                    io.to(roomId).emit('showQuestion', {questionNumber: quizObj.questionNumber, question: questionToShow.question, multipleChoice: questionToShow.multipleChoice});
                }
                else {
                    console.log('Game Over');
                    io.to(roomId).emit('endGame');
                }

            }

        })

        socket.on('userAnswer', (answer, userID) => {
            var quizObj = quizzes[roomId].quizObj;
            var players = quizzes[roomId].players;

            console.log(quizObj)
            console.log(userID)
            console.log(players)

            var playerFound = quizzes[roomId].players.find(player => player.uuid === userID)
            
            if (playerFound) {
                playerFound.questionAnswer = answer;
                console.log(`player found: ${playerFound}`)

                // socket.emit('showAnswer', answer); can do this as someone will be shown answer before another user answers the question in a room where people can view each others screens it will allow copying answers
    
                var allPlayersAnswered = players.every(player => player.questionAnswer !== null);
    
                if (allPlayersAnswered) {
                    console.log("All players have answered the question.");
                    var playersAnswers = 'hello world testing players answers';
                    io.to(roomId).emit('showAnswer', playersAnswers)
                } else {
                    console.log("Not all players have answered the question.");
                }
            }

            else {
                console.log("player doesn't exist");
            }

        });

        // if a client disconnects remove them from the list of players (it might be a good idea to later not do this and instead store them as disconnected idk then mayble instead of deleting codes from the map just recycle them instead of removing them)
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

