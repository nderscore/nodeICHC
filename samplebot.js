var ICHC = require('./ICHC.js');

var bot = ICHC({
    user: 'someusername',
    apiKey: 'someapikey',
    room: 'someroom'
}).on('message whisper pm', function(data){
    if(data.message == '!hi')
        this.send('Oh, hi there @' + data.username);
}).on('userJoin', function(data){
    this.whisper(data.username, 'Welcome to the room @' + data.username + '!');
}).
connect();