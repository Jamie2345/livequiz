const express = require('express');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId; // Import ObjectId for ID conversion
const app = express();
const ejs = require('ejs');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidV4 } = require('uuid');
const jwt = require('jsonwebtoken');

const port = 8080;

const dotenv = require('dotenv')
dotenv.config()

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true })

const quizSecret = process.env.QUIZ_AUTH_SECRET;

console.log(quizSecret)

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
let userQuizTokens = new Map();
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
    function verifyUser(userId, token) {

        console.log('verifying user function')
        console.log(userQuizTokens)
        console.log(userId)

        return userQuizTokens.get(userId) === token
    }

    socket.on('connectQuiz', (roomId, token) => {
        socket.join(roomId);
        console.log(token)

        // Once connected generate a uuid and a player obj for the client and add it to the dictionary.
        const userId = uuidV4();
        const player = new Player(userId);

        // generate a new username for the user
        player.name = player.generateName();  // should make a paramater called names in use to prevent duplicates
        
        if (!quizzes[roomId].players) {
            return false;
        }
        
        quizzes[roomId].players.push(player);

        const payload = {
            userId
        }

        const quizToken = jwt.sign(payload, quizSecret, { expiresIn: '1h' });
        userQuizTokens.set(userId, quizToken);
        console.log(userQuizTokens)

        console.log(quizToken);

        // Emit events to the connected client and all clients in the room
        socket.emit('connected', quizToken);
        io.to(roomId).emit('updatePlayers', quizzes[roomId].players);

        var quizObj = quizzes[roomId].quizObj;
        var players = quizzes[roomId].players;
        console.log('PLAYERS')
        console.log(players);

        // call this function to play the quiz
        function showNextQuestion() {
            var questionToShow = quizObj.nextQuestion()
            console.log(questionToShow);
            // io.to(roomId).emit('showQuestion', quizObj);
            io.to(roomId).emit('showQuestion', {questionNumber: quizObj.questionIndex, quizLength: quizObj.size, question: questionToShow.question, multipleChoice: questionToShow.multipleChoice});
            
            const submittedPlayersCount = players.filter(player => player.questionAnswer !== null).length;        
            socket.emit('incrementSubmitted', submittedPlayersCount, players.length);
        }

        function updateScores() {
            console.log('updateScores')
            players.forEach(player => {
                if (player.questionAnswer === quizObj.currentQuestion.answer) {
                    player.score += quizObj.ppq;
                }
            console.log(players)
            })
        }

        function showQuestionAnswer() {
            var correctAnswer = quizObj.currentQuestion.answer;
            console.log('correctAnswer');
            console.log(correctAnswer);
            io.to(roomId).emit('showAnswer', correctAnswer);
        }

        function quizGameLoop() {
            // function to make all players.questionAnswer be null before the next question is shown
            function setPlayersAnswersToNull() {
                players = players.map(player => {
                    player.questionAnswer = null;
                    return player;
                });

                console.log(players);
            }

            function checkIfAllPlayersAnswered() {
                return players.every(player => player.questionAnswer !== null);
            }

            console.log('questionsLeft ' + quizObj.questionsLeft());
            console.log(quizObj.isGameRunning());
            console.log(quizObj.questionNumber);
            console.log(quizObj.size);

            if (quizObj.questionsLeft() > 0) {
            
                setPlayersAnswersToNull();
                showNextQuestion();

                // show a question then after x seconds or if all players have answered show the answer
                let counter = 0;
                const timeBetweenIteration = 1000; // 1 second between each loop
                
                function simulateWhileLoop(duration) { 
                    const numberOfIterations = duration / timeBetweenIteration; // how many loops will occur (one loop every 1000ms / 1s)

                    // if all players answered or the loop has finished
                    if (checkIfAllPlayersAnswered() || ((counter >= numberOfIterations))) {
                        updateScores();
                        showQuestionAnswer();
                        setTimeout(quizGameLoop, 5000); // display answer for 5s then go to next question
                    }
                    else {
                        counter ++;
                        setTimeout(() => {
                            simulateWhileLoop(duration);
                        }, timeBetweenIteration);
                    }
                    
                }
                
                simulateWhileLoop(10000);
                
            }
            else {
                console.log('no questions left to show');
                io.to(roomId).emit('displayLeaderboard', players);
            }
        }



        socket.on('ready', (user) => {
            const foundPlayer = players.find(player => player.uuid === user);
            foundPlayer.toggleReady();
            
            io.to(roomId).emit('updatePlayers', players);  // broadcast a signal to all clients to update players
            

            // if all players have pressed the ready button send a signal to the room to start the game            
            const allPlayersReady = players.every(player => player.ready);
            if (allPlayersReady) {
                io.to(roomId).emit('startGame');
                quizzes[roomId].waiting = false;

                const submittedPlayersCount = players.filter(player => player.questionAnswer !== null).length;
                socket.emit('incrementSubmitted', submittedPlayersCount, players.length);

                // start the quiz
                quizGameLoop();
            }

        })

        socket.on('userAnswer', (answer, userID, token) => {

            console.log(quizObj)
            console.log(userID)
            console.log(players)
            
            console.log(`user token auth ${token}`)
            console.log(players)
    
            var playerFound = players.find(player => player.uuid === userID)
            
            if (verifyUser(userID, token)) {

                if (playerFound) {
                    
                    if (playerFound.questionAnswer === null) {
                        playerFound.questionAnswer = answer;
                    }
                    
                    console.log(`player found: ${playerFound}`);

                    const submittedPlayersCount = players.filter(player => player.questionAnswer !== null).length;
                    
                    socket.emit('incrementSubmitted', submittedPlayersCount, players.length);
                    // socket.emit('showAnswer', answer); can do this as someone will be shown answer before another user answers the question in a room where people can view each others screens it will allow copying answers
                }
    
                else {
                    console.log("player doesn't exist");
                }

            }

            else {
                console.log("Invalid auth token");
            }

        });

        // if a client disconnects remove them from the list of players (it might be a good idea to later not do this and instead store them as disconnected idk then mayble instead of deleting codes from the map just recycle them instead of removing them)
        socket.on('disconnect', () => {
            if (players.length >= 2) {
                const playerIndex = players.findIndex(player => player.uuid === uuid);
                players.splice(playerIndex, 1);
                io.to(roomId).emit('updatePlayers', players);
            }

            else {
                delete quizzes[roomId];
                deleteByValue(quizCodes, roomId);
            }
        });
    });
});

server.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
});

