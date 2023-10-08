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

    socket.on('showQuestion', (questionJson) => {
        console.log(questionJson);
    });
    
    socket.on('disconnect', (uuid) => {
        console.log("disconnect: " + uuid);
    })
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

