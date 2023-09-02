document.addEventListener('DOMContentLoaded', function() {
    const joinForm = document.getElementById('joinForm');

    joinForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const code = document.getElementById('code').value;
        joinQuizRoom(code);
    });
});

function joinQuizRoom(code) {
    // AJAX POST request to /join
    fetch('/join', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response data as needed
        if (data.redirect) {
            window.location.href = data.redirect + `?code=${code}`; // Redirect to the URL received in the response
        } else if (data.message) {
            console.log(data.message);
        }
        else {
            console.log('Error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
