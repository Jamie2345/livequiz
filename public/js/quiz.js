const socket = io();

console.log(ROOM_ID)

let CLIENT_ID;

function getCookie(cookieName) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(`${cookieName}=`)) {
            return cookie.substring(cookieName.length + 1);
        }
    }
    return null; // Cookie not found
}

let auth = getCookie('quizToken');  // try to get a quizToken if they have one if not one will be created when they connect to the quiz the quizToken is used to store thier user id in cache as well as to provide proof the user is the actual user to prevent people from being able to send fake requests using thier id 
socket.emit('connectQuiz', ROOM_ID, auth);

socket.on('connected', (quizToken) => {
    // Split the token into its three parts: header, payload, and signature
    const parts = quizToken.split('.');
    const encodedPayload = parts[1];

    // Decode the Base64-encoded payload
    const decodedPayload = atob(encodedPayload);

    // Parse the JSON payload
    const payloadData = JSON.parse(decodedPayload);
    console.log(payloadData)
    CLIENT_ID=payloadData.userId;
    auth=quizToken;

    const expirationTime = new Date(Date.now() + 3600000);
    document.cookie = `quizToken=${auth}; expires=${expirationTime.toUTCString()};`;

    console.log(auth);
    console.log("client: " + CLIENT_ID);
    
    socket.on('updatePlayers', (updatedPlayers) => {
        updatePlayersList(updatedPlayers);
    });

    socket.on('startGame', () => {
        const playersList = document.querySelector('.playerslist-container');
        playersList.remove();

        const waitingSign = document.querySelector('.waiting-room-title');
        waitingSign.remove();

        const questionsRemaining = document.querySelector('.questions-left-container');
        questionsRemaining.style.display = 'flex';

        showTimerElement();
    });

    socket.on('incrementSubmitted', (playersSubmitted, playersCount) => {
        document.querySelector('.players-submitted').style.display = 'flex';
        document.getElementById('total-submitted').innerHTML = playersSubmitted;
        document.getElementById('total-players').innerHTML = playersCount;
    });

    socket.on('showQuestion', (questionJson) => {
        console.log(questionJson);
        resetTimer();
        //showTimerElement();
        turnOffSpinner();
        removeOldQuestion();
        displayQuestion(questionJson);
        // Create a new div element
        const timerDiv = document.createElement('div');

        // Set the id attribute to "timer"
        timerDiv.id = 'timer';

        // Append the div to the body of the document
        document.body.appendChild(timerDiv);
        startTimer();
    });

    socket.on('showAnswer', (correctAnswer) => {  // actually don't need to send all the players answers if you just need to store the clicked on the client side
        turnOffSpinner();
        //hideTimerElement();
        displayAnswer(correctAnswer);
    });

    function removeTimerElement() {
        let timerElement = document.getElementById('timer');
        timerElement.remove();
    }

    function hideTimerElement() {
        let timerElement = document.getElementById('timer');
        timerElement.style.display = 'none';
    }

    function showTimerElement() {
        let timerElement = document.getElementById('timer');
        timerElement.style.display = 'block';
    }

    socket.on('displayLeaderboard', (players) => {
        
        const questionsRemaining = document.querySelector('.questions-left-container');
        questionsRemaining.style.display = 'none';
        
        turnOffSpinner();
        removeTimerElement();
        console.log('leaderboard');
        console.log('leaderboarding function');
        removeOldQuestion();
        console.log('Players');
        console.log(players);
        console.log(players[0]);
    
        players.sort((a, b) => b.score - a.score);
    
        let top3Players = players.slice(0, 3);
        console.log(top3Players);
    
        const highestScore = top3Players[0].score;
    
        let mainBoardContainer = document.createElement('div');
        mainBoardContainer.className = 'leaderboard-main-container';
    
        document.body.appendChild(mainBoardContainer);
    
        // Create the bar container dynamically
        let boardContainer = document.createElement('div');
        boardContainer.className = 'leaderboard-container';
    
        // Get the body element and append the bar container
        mainBoardContainer.appendChild(boardContainer);
    
        function toOrdinal(number) {
            // Check if the number is between 11 and 13
            // If yes, use 'th' as the suffix
            if (number >= 11 && number <= 13) {
                return number + 'th';
            }
    
            // Otherwise, determine the suffix based on the last digit
            switch (number % 10) {
                case 1:
                    return number + 'st';
                case 2:
                    return number + 'nd';
                case 3:
                    return number + 'rd';
                default:
                    return number + 'th';
            }
        }
    
        // Loop through the sorted players and create bars using a for loop
        for (let i = 0; i < top3Players.length; i++) {
            const player = top3Players[i];
    
            // Calculate the bar height relative to the highest score
            let barHeight = (player.score / highestScore) * 100;
    
            // Create a bar element
            let boardPodium = document.createElement('div');
            boardPodium.className = 'leaderboard-podium';
    
            // Add class based on position for color
            if (i === 0) {
                boardPodium.classList.add('gold');
            } else if (i === 1) {
                boardPodium.classList.add('silver');
            } else if (i === 2) {
                boardPodium.classList.add('bronze');
            }
    
            boardPodium.style.setProperty('--target-height', barHeight + '%');
    
            // Create player leaderboard position
            let playerPosition = document.createElement('h2');
            playerPosition.innerHTML = `${toOrdinal(i + 1)} Place`;
    
            // Create a text element for the player's name
            let barText = document.createElement('h3');
            barText.innerHTML = player.name;
    
            // Create a bar to show
            let barBlock = document.createElement('div');
            barBlock.className = 'leaderboard-podium-bar';
    
            // Append the bar and text to the container
            boardPodium.appendChild(playerPosition);
            boardPodium.appendChild(barText);
            boardPodium.appendChild(barBlock);
    
            // Append the bars to the container
            if (i === 1 && players.length === 3) {
                // For the first player, insert before the first child
                boardContainer.insertBefore(boardPodium, boardContainer.firstChild);
            } else {
                boardContainer.appendChild(boardPodium);
            }
        }
    
        window.scrollTo(0, document.body.scrollHeight); // scroll down so the leaderboard is fully visible
    });
    
    

    socket.on('disconnect', (uuid) => {
        console.log("disconnect: " + uuid);
    });

    function turnOnSpinner() {
        const spinner = document.querySelector('.spinner-container');
        spinner.style.display = 'flex';
    }

    function turnOffSpinner() {
        const spinner = document.querySelector('.spinner-container');
        spinner.style.display = 'none';
    }

    function displayQuestion(questionJson) {
        const questionElement = document.createElement('h1');
        questionElement.innerHTML = questionJson.question;
        questionElement.className = 'questionText';

        console.log('question json');
        console.log(questionJson);

        // update the questions remaining
        let questionNumberElement = document.getElementById('question-number');
        let totalQuestionsElement = document.getElementById('total-questions');
    
        questionNumberElement.innerHTML = questionJson.questionIndex+1;
        totalQuestionsElement.innerHTML = questionJson.quizLength;

        console.log(questionJson.question);
        console.log(questionElement);
    
        const multipleChoiceContainer = document.createElement('div');
        multipleChoiceContainer.className = 'multiple-choice-container';

        const playersSubmitted = document.getElementById('total-submitted');
        playersSubmitted.innerHTML = '0';
    
        questionJson.multipleChoice.forEach(choice => {
            const multipleChoiceAnswer = document.createElement('div');
            multipleChoiceAnswer.setAttribute('data-answer', choice);
            multipleChoiceAnswer.className = 'multiple-choice';

            const answerText = document.createElement('p');
            answerText.innerHTML = choice;

            multipleChoiceAnswer.appendChild(answerText);
            multipleChoiceContainer.appendChild(multipleChoiceAnswer);

            multipleChoiceAnswer.addEventListener("click", (e) => {
                // only allow one element to be clicked=true
                if (document.querySelector('[clicked="true"]') === null) {
                    multipleChoiceAnswer.setAttribute('clicked', true);
                    var userAnswer = answerText.innerHTML;
                    socket.emit("userAnswer", userAnswer, CLIENT_ID, auth);
    
                    multipleChoiceContainer.style.display = 'none';
                    
                    var questionShown = document.querySelector('.questionText');
                    if (questionShown) {
                        questionShown.style.display = 'none';
                    }

                    turnOnSpinner();
                }

            });
        })
        multipleChoiceContainer.appendChild(questionElement);
    
        document.body.appendChild(questionElement);
        document.body.appendChild(multipleChoiceContainer);

    }

    function removeOldQuestion() {
        var oldQuestion = document.querySelector('.questionText');
        var oldMultipleChoiceContainer = document.querySelector('.multiple-choice-container');

        if (oldQuestion) {
            oldQuestion.remove();
        }

        if (oldMultipleChoiceContainer) {
            oldMultipleChoiceContainer.remove();
        } 
    }

    function displayAnswer(correctAnswer) {
        var questionShownElement = document.querySelector('.questionText');
        questionShownElement.style.display = 'block';  // style.display

        var multipleChoiceContainer = document.querySelector('.multiple-choice-container');
        multipleChoiceContainer.style.display = 'grid';

        var userAnswer = document.querySelector('[clicked="true"]');
        console.log(correctAnswer);
        var correctAnswerElement = document.querySelector(`[data-answer="${correctAnswer}"]`);
        console.log(correctAnswerElement);

        if (userAnswer && userAnswer.innerHTML !== correctAnswer) {
            userAnswer.style.backgroundColor = 'red';
        }
        
        correctAnswerElement.style.backgroundColor = 'green';
    }

})


function updatePlayersList(players) {
    const playersList = document.querySelector('.playerslist-container');
    playersList.innerHTML = ''
    for (let player of players) {
        var playerContainer = document.createElement('div');
        playerContainer.className = 'player-container';
        var textElement = document.createElement('p');
       
        textElement.innerHTML = player.name;
        if (player.uuid == CLIENT_ID) {
            textElement.innerHTML += ' (You)';
        }

        var statusSpanElement = document.createElement('span');
        if (player.ready) {
            statusSpanElement.innerHTML = ' (Ready)';
            statusSpanElement.style.color = 'green';
        }
        else {
            statusSpanElement.innerHTML = ' (Not Ready)';
            statusSpanElement.style.color = 'red';
        }

        textElement.appendChild(statusSpanElement);
        
        playerContainer.appendChild(textElement);
        
        if (player.uuid == CLIENT_ID) {
            var readyButton = document.createElement('button');
            readyButton.innerHTML = 'Toggle Ready';
            readyButton.addEventListener('click', () => {
                socket.emit('ready', CLIENT_ID);
            });
        
            playerContainer.appendChild(readyButton);
        }

        playersList.appendChild(playerContainer);
    }
}