const socket = io();

console.log(ROOM_ID)
socket.emit('connectQuiz', ROOM_ID);

let players = [];
let CLIENT_ID;

socket.on('uuid', uuid => {
    CLIENT_ID=uuid;
    console.log("client: " + uuid);
    
    socket.on('updatePlayers', (updatedPlayers) => {
        players = updatedPlayers;
        
        updatePlayersList();
    });

    socket.on('startGame', () => {
        const playersList = document.querySelector('.playerslist-container');
        playersList.remove();

        const waitingSign = document.querySelector('.waiting-room-title');
        waitingSign.remove();
    });

    socket.on('showQuestion', (questionJson) => {
        console.log(questionJson);
        displayQuestion(questionJson);
    });

    socket.on('showAnswer', (playersAnswers) => {
        console.log(playersAnswers);
        displayAnswer(playersAnswers);
    });
    
    socket.on('disconnect', (uuid) => {
        console.log("disconnect: " + uuid);
    });

    function displayQuestion(questionJson) {
        const questionElement = document.createElement('h1');
        questionElement.innerHTML = questionJson.question;
    
        console.log(questionJson.question);
        console.log(questionElement);
    
        const multipleChoiceContainer = document.createElement('div');
        multipleChoiceContainer.className = 'multiple-choice-container';
    
        questionJson.multipleChoice.forEach(choice => {
            const multipleChoiceAnswer = document.createElement('div');
            multipleChoiceAnswer.className = 'multiple-choice';

            const answerText = document.createElement('p');
            answerText.innerHTML = choice;
    
            multipleChoiceAnswer.appendChild(answerText);
            multipleChoiceContainer.appendChild(multipleChoiceAnswer);

            multipleChoiceAnswer.addEventListener("click", () => {
                var userAnswer = answerText.innerHTML;

                socket.emit("userAnswer", userAnswer, CLIENT_ID);
            });
        })
        multipleChoiceContainer.appendChild(questionElement);
    
        document.body.appendChild(questionElement);
        document.body.appendChild(multipleChoiceContainer);

    }

    function displayAnswer(playersAnswers) {
        console.log(playersAnswers);
    }

})


function updatePlayersList() {
    const playersList = document.querySelector('.playerslist-container');
    playersList.innerHTML = '';
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