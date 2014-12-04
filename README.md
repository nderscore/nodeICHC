nodeICHC
========

A node.js module to interact with the "I Can Haz Chat" API for the purpose of creating bots.

Dependencies
========
* [superagent](https://github.com/visionmedia/superagent) - Run `npm install superagent` in console.

Usage
========
Including the module is simple. Just a single line is needed. Update the path to ICHC.js relative to your script.
```javascript
var ICHC = require('./ICHC.js');
```

Creating a bot
========
Calling the `ICHC` function creates a new bot. It takes a single parameter of an object of configuration options:

**_*_** = optional

* **user** - The username of your bot

* **apiKey** - The API key for your account (Don't have an API key? [get one!](http://www.icanhazchat.com/settings/account_key))

* **room** - The room your bot will join

* **_pingInterval*_** - How often your bot will poll the server in ms. 
**Default:** `2000` (2 seconds)

* **_pingTimeout*_** - Number of failed pings before the bot is considered disconnected. 
**Default:** `30`

* **_autoReconnect*_**  - Should the bot try to reconnect when disconnected? 
**Default:** `true`

* **_reconnectInterval*_** - How often to attempt reconnects in ms. 
**Default:** `30000` (3 seconds)

* **_debug*_** - Enables debug logging of all requests/repsonses from the server.
**Default:** `false`

Here's an example:
```javascript
var bot = ICHC({
    user: 'someusername',
    apiKey: 'someapikey',
    room: 'someroom'
});
```

Bot functions
========
These functions allow you to control your bot. All functions are chainable. All success/fail callback functions can use `this` as a reference to the bot.

**_*_** = optional

* **.connect(_success*_, _fail*_)** - Connects the bot to the room
  * _success*_ - Success callback function
  * _fail*_ - Fail callback function

```javascript
bot.connect();
```

* **.send(_message_, _success*_, _fail*_)** - Sends a message or command to the room
  * _message_ - Message or command to send
  * _success*_ - Success callback function
  * _fail*_ - Fail callback function

```javascript
bot.send('Hello world!');
```

* **.whisper(_username_, _message_, _success*_, _fail*_)** - Shortcut for /msg
  * _username_ - Username to whisper to
  * _message_ - Message to send
  * _success*_ - Success callback function
  * _fail*_ - Fail callback function

```javascript
bot.whisper('SomeUser', 'Pssst! Hey you!');
```

* **.pm(_username_, _message_, _success*_, _fail*_)** - Shortcut for /privmsg
  * _username_ - Username to PM
  * _message_ - Message to send
  * _success*_ - Success callback function
  * _fail*_ - Fail callback function

```javascript
bot.pm('SomeUser', 'Hello there!');
```

* **.on(_eventType_, _eventHandler_)** - Binds an event handler to one or more events
  * _eventType_ - A string of one or more event types. For multiple events, seperate them by spaces
  * _eventHandler_ - Function to handle this event. The function should accept one parameter, which is an object of data about the event

```javascript
// binding to a single event
bot.on('message', function(data){
    console.log('Chat message recieved from ' + data.username + ': ' + data.message);
});

// binding to multiple events
bot.on('message whisper pm', function(data){
    console.log('Some kind of message recieved from ' + data.username + ': ' + data.message);
});
```

* **.off(_eventType*_, _eventHandler*_)** - Unbinds an event handler to one or more events
  * _eventType*_ - A string of one or more event types. For multiple events, seperate them by spaces. If this parameter is left out, it will remove all event handlers from all events
  * _eventHandler*_ - A reference to a specific event handler function. If this parameter left out, it will remove all event handlers bound to the event type

```javascript
// unbinding a single event
bot.off('message', someHandler);

// unbinding all 'message' events
bot.off('message');

// unbinding all events
bot.off(); 
```

Event types
========

Here is a list of all available event types for `.on` and `.off` with descriptions of the data they pass to the event handler function. All event handlers can use `this` as a reference to the bot.

All events have at least one data property `eventType`, which contains the name of the event type that was triggered.

* **connect** - Fires when the bot connects to the room
  * _(no extra event data)_

* **disconnect** - Fires when the bot is disconnected from the room
  * _(no extra event data)_

* **ping** - Fires whenever a ping is made to the server
  * _(no extra event data)_

* **message** - Fires when a message is recieved in chat
  * _username_ - The username who sent the message
  * _message_ - The message body
  * _emote_ - A boolean value whether or not the message was an emote (/me)

* **whisper** - Fires when the bot recieves a whisper
  * _username_ - The username who sent the whisper
  * _message_ - The message body

* **pm** - Fires when the bot recieves a PM
  * _username_ - The username who sent the PM
  * _message_ - The message body

* **userJoin** - Fires when a user joins the room
  * _username_ - The username who joined

* **userQuit** - Fires when a user leaves the room
  * _username_ - The username who left

* **userKick** - Fires when a user is kicked from the room
  * _username_ - The username who was kicked
  * _kickedBy_ - The username who kicked that user

* **userCamUp** - Fires when a user cams up
  * _username_ - The username who cammed up

* **userCamDown** - Fires when a user cams up
  * _username_ - The username who cammed down

* **error** - Fires when an error occurs
  * _message_ - Message containing information about the error