/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * This server takes care of relaying rotation in formation from phone's gyro
 * to the larger screen. 
 */

const ab2str = require('arraybuffer-to-string')
const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');

const aws = true;
const port = 443;   

const osc = require('osc');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const ip = require('ip');
const https = require('https');
const fs = require('fs');
const app = express();
const compiler = webpack(config);
const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    watchOptions: {
        aggregateTimeout: 300,
        poll: true
    },
});


const { colors } = require('./colors.js');

var HOST, PORT;

if (aws) {
 //   HOST = "58.229.149.145"; // jeokdo
    //HOST = "183.96.170.53"; // giy home
    HOST = "210.94.143.30"; // PAL_studio
  //HOST = "10.160.87.177";
    PORT = 9001;
} else {
    HOST = "localhost";
    PORT = 9001;
}


var options = {};

if (aws) {
    options = {
        key: fs.readFileSync('/etc/letsencrypt/live/hidden-protocol.xyz/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/hidden-protocol.xyz/cert.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/hidden-protocol.xyz/chain.pem')
    }
} else {
    options = {
        key: fs.readFileSync('hp-key.pem'),
        cert: fs.readFileSync('hp-cert.pem'),
    }
}


var remoteDevices = new Object(null);
const timeLimit = 60 * 5; // sec


const server = https.createServer(options, app);
const io = require('socket.io')(server);


app.use(middleware);
app.use(webpackHotMiddleware(compiler));

// The screen that shows "cursors" (circles) that are being controlled by 
// a smartphone. 
// This is usually where the main content of xyfi lives.
app.get('/screen', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname,
        'dist/screen.html')));
    res.end();
});

// The remote interface that shows on people's phones in a browser or captive 
// portal. 
app.get('*', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname,
        'dist/remote.html')));
    res.end();
});

server.listen(port, '0.0.0.0', function onStart(err) {
    if (err) {
        console.log(err);
    }
    console.info(
        '==> 🌎 Listening on port %s. Open up https://0.0.0.0:%s/ in your browser.',
        port,
        port
    );
});

function arrayRemove(arr, value) {

    return arr.filter(function(ele) {
        return ele != value;
    });

}

var randomProperty = function(obj) {
    var keys = Object.keys(obj)
    return obj[keys[keys.length * Math.random() << 0]];
};


String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
};


var screens = io.of('/screens');
var remotes = io.of('/remotes');


remotes.on('connection', function(remote) {
    // var clients = io.of('/remotes').clients();
    var clients = Object.keys(io.sockets.sockets);
    console.log("---------------clients----------------")
    console.log(clients)
        // var _id = remote.id.split('#')[1].toString();
    var _id = remote.id.replace("/remotes#", '');
    console.log(typeof(_id)); // keep this line
    screens.emit('push', remote.id);
    console.log('remote connected');
    remotes.emit('reconnect');
    remotes.emit('setTouching', false);

    /*
    {
      ZfOiBHb5HK28w1S8AAAA: [ '#e6e6fa', 14 ],
      ST1xO9dOmSJHvdoFAAAC: [ '#800080', 5 ],
      GevTMYcPv7Z34WHyAAAD: [ '#9370d8', 7 ]
    }
    */
    // var obj;
    if (!remoteDevices[_id]) {
        // obj = new Object(null);
        var randCol = randomProperty(colors);

        Object.keys(remoteDevices).forEach(function(item) {
            // console.log(item); // key
            // console.log(remoteDevices[item]); // value
            if (remoteDevices[item].color === randCol) {
                randCol = remoteDevices[item].color;
                randCol.replaceAt(1 + (Math.floor(Math.random() * 6)), (Math.floor(Math.random() * 10)).toString());
                console.log(randCol + " / " + remoteDevices[item].color); // TODO: check is it different
            }

        });

        remote.emit('color', randCol)
        var v = new Object(null)
        v.color = randCol
        v.timer = 0
        remoteDevices[_id] = v;
    }

    console.log(remoteDevices)

    remote.once('disconnect', function() {
        console.log('remote disconnected');
        screens.emit('pop', _id);
        sendTouch(_id, false); // send pos via OSC to unity
        delete remoteDevices[_id];
        console.log(remoteDevices)
    });


    remote.on('position', function(position) {
        screens.emit('position', remote.id, position);
        console.log(position);

        // reset timer
        if (_id in remoteDevices) {
            remoteDevices[_id].timer = 0;
            if (position.length > 0) {
                sendPos(_id, position) // send pos via OSC to unity
            } else {
                console.log("position array is EMPTY!");
            }
        }
    });

    remote.on('touching', function(touching) {
        console.log(touching);
        sendTouch(_id, touching); // send pos via OSC to unity
        remoteDevices[_id].isTouching = touching;

        if (touching) {
            sendColor(_id, remoteDevices[_id].color)
        }
    });

    // remote.on('log', function(str) {
    //   console.log(str)
    // })

});

screens.on('connection', function(socket) {
    socket.emit('initialize', {
        remoteIDs: Object.keys(remotes.sockets),
        address: `${ip.address()}:${port}`
    });
});


var udpPort = new osc.UDPPort({
    // This is the port we're listening on.
    localAddress: "localhost",
    localPort: 9000,

    // This is where Unity is listening for OSC messages.
    remoteAddress: HOST,
    remotePort: PORT,
    metadata: true
});



let oscTouchMessage = function(remoteId, touching) {
    var message = osc.writeMessage({
        address: '/unity/touching',
        args: [{
                type: "s",
                value: remoteId
            },
            {
                type: "s", // send boolean as string
                value: touching
            }
        ]
    });

    return Buffer.from(message);
}

let oscPosMessage = function(remoteId, position) {
    var message = osc.writeMessage({
        address: "/unity/pointing",
        args: [{
                type: "s",
                // value: remoteId.split('#')[1] // /remote#ABCD!@#$ ==> ABCD!@#$
                value: remoteId
            },
            {
                type: "f",
                value: position[0]
            },
            {
                type: "f",
                value: position[1]
            }
        ]
    });

    return Buffer.from(message)

}

let oscColorMessage = function(remoteId, color) {

    var r = (parseInt(color.substr(1, 2), 16)) / 256 // r
    var g = (parseInt(color.substr(3, 2), 16)) / 256 // r
    var b = (parseInt(color.substr(5, 2), 16)) / 256 // r

    console.log(r + " / " + g + " / " + b)

    var message = osc.writeMessage({
        address: "/unity/coloring",
        args: [{
                type: "s",
                value: remoteId
            },
            {
                type: "f",
                value: r
            },
            {
                type: "f",
                value: g
            },
            {
                type: "f",
                value: b
            }

        ]
    });

    return Buffer.from(message)

}

let sendTouch = function(remoteId, touching) {
    var m = oscTouchMessage(remoteId, touching);
    // console.log(ab2str(m));
    client.send(m, PORT, HOST, function(err, bytes) {
        if (err) throw new Error(err);
    })
}

let sendPos = function(remoteId, position) {
    var m = oscPosMessage(remoteId, position)
    client.send(m, PORT, HOST, function(err, bytes) {
        if (err) throw new Error(err);
    })
}

let sendColor = function(remoteId, color) {
    var m = oscColorMessage(remoteId, color)
    client.send(m, PORT, HOST, function(err, bytes) {
        if (err) throw new Error(err);
    })
}


// Open the socket.
udpPort.open();

// Listen for incoming OSC bundles.
udpPort.on("message", function(oscMsg) {
    //    console.log("An OSC message just arrived!", oscMsg);
    if (oscMsg.address === "/pointingInUnity") {
        var id = oscMsg.args[0].value;
        var tag = oscMsg.args[1].value;

        console.log(id);
        console.log(tag);
    }
});


// Timer
function addTimer() {
    Object.keys(remoteDevices).forEach(function(item) {
        // console.log(item); // key
        // console.log(remoteDevices[item]); // value
        if (!remoteDevices[item].isTouching) {
            remoteDevices[item].timer++;
            console.log(remoteDevices);
        }

    });
}

setInterval(addTimer, 1000);


function cleanZombieRemote() {
    if (Object.keys(remoteDevices).length == 0) { return; }

    Object.keys(remoteDevices).forEach(function(item) {
        // console.log(item); // key
        // console.log(remoteDevices[item]); // value
        if (remoteDevices[item].timer > timeLimit) {
            io.sockets.sockets[item].emit('disconnect')
                // remote.emit('disconnect')
            io.sockets.sockets[item].disconnect(true)
            delete remoteDevices[item];
        }
    });
    console.log("Clear zombie!");
    console.log(remoteDevices);
}

setInterval(cleanZombieRemote, timeLimit / 2 * 1000);
