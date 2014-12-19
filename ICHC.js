var request = require('superagent');

module.exports = function(config){
    for(var param in ({user:1, apiKey:1, room:1}))
        if(!config.hasOwnProperty(param))
            throw 'Missing config parameter: ' + param;

    var DEFAULTS = {
        pingInterval: 2e3,
        pingTimeout: 30,
        autoReconnect: true,
        reconnectInterval: 30e3,
        debug: false
    };
    for(var param in DEFAULTS)
        if(!config.hasOwnProperty(param))
            config[param] = DEFAULTS[param];
    if(config.pingInterval < 2e3)
        throw 'Don\'t be a jerk.';

    /* private variables of interest */
    var apiVersion = 1,
    baseURL = 'http://www.icanhazchat.com/api.ashx?v=' + apiVersion,
    isConnected = false,
    keyedURL = '',
    cammers = {},
    listeners = {
        connect: [],
        disconnect: [],
        ping:[],
        message: [],
        pm: [],
        whisper: [],
        userJoin: [],
        userKick: [],
        userQuit: [],
        userCamUp: [],
        userCamDown: [],
        send:[],
        error: []
    },
    trigger = function(type, data){
        var modifiedData = {
            eventType: type
        };
        for(var x in data)
            if(x != 'eventType')
                modifiedData[x] = data[x];
        (listeners[type] || []).forEach(function(listener){
            listener.call(chain, modifiedData);
        });
    },
    error = function(message){
        if(listeners.error.length){
            trigger('error', {
                message: message
            });
        }
    },
    makeRequest = function(params, success, fail){
        var url = isConnected ? keyedURL : baseURL;
        for(var param in params)
            url += '&' + param + '=' + params[param];
        request.get(url).
        on('error', function(err){
            error('Request error: ' + err);
            fail && fail.call(chain);
        }).
        end(function(response){
            if(!response.ok){
                error('Request error: ' + response.text);
                fail && fail.call(chain);
                return;
            }
            if(config.debug)
                console.log(url + '\n' + response.text + '\n');
            var lines = response.text.split(/\n/),
                isOK = lines.shift();
            if(isOK != 'OK'){
                fail && fail.call(chain, isOK);
                return;
            }
            success && success.call(chain, lines);
            parseResponse.call(chain, lines);
       });
    },
    pingFailures = 0,
    intPing = -1,
    disconnect = function(){
        isConnected = false;
        clearInterval(intPing);
        keyedURL = '';
        if(config.autoReconnect){
            (function reconnect(){
                chain.connect(null, function(){
                    setTimeout(reconnect, config.reconnectInterval)
                });
            })();
        }
    },
    ping = function(){
        makeRequest({
            a: 'recv'
        }, function(){
            pingFailures = 0;
            trigger('ping');
        }, function(){
            if(++pingFailures == config.pingTimeout)
                disconnect();
        });
    },
    htmlEntityDecode = function(text){
        return text.replace(/&#(\d+);/g, function(entity, num){
            return String.fromCharCode(num);
        });
    },
    parseResponse = function(lines){
        lines.forEach(function(line){
            var r = /^\[([^\]]+)\]/,
            eventType = (line.match(/^\[([^\]]+)\]/) || [, 'message'])[1];
            line = line.replace(r, '');
            switch(eventType){
                case 'message':
                    var parse = line.match(/^.+\|(.*?)(\:)?\s(.+)/);
                    if(parse){
                        username = parse[1],
                        message = parse[3];
                        if(username){
                            trigger('message', {
                                username: username,
                                message: htmlEntityDecode(message),
                                emote: !!parse[2]
                            });
                        } else {
                            var parseMsg;
                            if(parseMsg = message.match(/(.+?) has kicked (.+?) from the room/)){
                                trigger('userKick', {
                                    username: parseMsg[2],
                                    kickedBy: parseMsg[1]
                                });
                            }
                        }
                    }
                    break;

                case 'msg':
                    var parse = line.match(/^.+\|(.+?)\|.+?\|(.+)/),
                    username = parse[1];
                    if(username != config.user){
                        trigger('whisper', {
                            username: username,
                            message: htmlEntityDecode(parse[2])
                        });
                    }
                    break;

                case 'priv':
                    var parse = line.match(/^.+\|(.+?)\|(.+)/);
                    if(!/\|from you to /.test(line)){
                        trigger('pm', {
                            username: parse[1],
                            message: htmlEntityDecode(parse[2])
                        });
                    }
                    break;

                case 'hi':
                    var rMod = /\*$/,
                        username = line.replace(rMod, '');
                    if(username != config.user){
                        trigger('userJoin',{
                            username: username,
                            mod: rMod.test(line)
                        });
                    }
                    break;

                case 'bye':
                    trigger('userQuit', {
                        username: line
                    });
                    break;

                case 'c+':
                    var parse = line.match(/.(.{12})(.+?)\./),
                    hash = parse[1],
                    username = parse[2];
                    cammers[hash] =  username;
                    trigger('userCamUp', {
                        username: username
                    });
                    break;

                case 'c-':
                    var username = cammers[line] || '';
                    delete cammers[line];
                    trigger('userCamDown', {
                        username: username
                    });
                    break;

                case '':
                    disconnect();
                    trigger('disconnect');
                    break;
            }
        });
    },
    chain = {
        /* command functions */

        connect: function(success, fail){
            if(isConnected)
                error('Already connected.');
            else {
                makeRequest({
                    u: config.user,
                    p: config.apiKey,
                    a: 'join',
                    w: config.room
                }, function(data){
                    isConnected = true;
                    keyedURL = baseURL + '&k=' + data[0];
                    intPing = setInterval(ping, config.pingInterval);
                    success && success.call(chain, data);
                    trigger('connect');
                }, function(data){
                    fail && fail.call(chain, data);
                });
            }
            return this;
        },

        send: function(message, success, fail){
            if(!message)
                error('No message.');
            else if(!isConnected)
                error('Not connected.');
            else {
                makeRequest({
                    a: 'send',
                    w: message
                }, success, fail);
                trigger('send', {
                    message: message
                });
            }
            return this;
        },

        whisper: function(username, message, success, fail){
            return this.send('/msg ' + username + ' ' + message, success, fail);
        },

        pm: function(username, message, success, fail){
            return this.send('/privmsg ' + username + ' ' + message, success, fail);
        },

        /* getter functions */
        /* I'll build these later
        getUsers: function(success, fail){
            return this;
        },

        getIdlers: function(success, fail){
            return this;
        },

        getMods: function(success, fail){
            return this;
        },

        getCammers: function(success, fail){
            return this;
        },
        */

        /* event listener functions */

        on: function(evt, handler){
            evt.split(' ').forEach(function(evt){
                if(!listeners[evt])
                    error('Invalid event type: ' + evt);
                else if(typeof handler != 'function')
                    error('Event handler must be a function.');
                else 
                    listeners[evt].push(handler);
            });
            return this;
        },

        off: function(evt, handler){
            evt.split(' ').forEach(function(evt){
                if(!listeners[evt])
                    for(var evt in listeners)
                        listeners[evt] = [];
                else if(!handler)
                    listeners[evt] = [];
                else
                    listeners[evt] = listeners[evt].filter(function(listener){
                        return listener !== handler;
                    });
            });
            return this;
        }
    };

    return chain;
};