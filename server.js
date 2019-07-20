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
const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const port = 8080;
const ip = require('ip');

const app = express();
const compiler = webpack(config);
const middleware = webpackMiddleware(compiler, {
  publicPath: config.output.publicPath,
  watchOptions: {
    aggregateTimeout: 300,
    poll: true
  },
});
const http = require('http');
const server = http.createServer(app);
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
    '==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', 
    port, 
    port
  );
});

var screens = io.of('/screens');
var remotes = io.of('/remotes');

remotes.on('connection', function (remote) {
  screens.emit('push', remote.id);
  console.log('remote connected');

  remote.once('disconnect', function () {
    screens.emit('pop', remote.id);
  });

  remote.on('position', function (position) {
    screens.emit('position', remote.id, position);
    // console.log(position);
    sendPosition(remote.id, position); // send position data to Unity via OSC
  });

  remote.on('touching', function (touching) {
    console.log(touching);
    sendTouching(remote.id, touching); // send touching data to Unity via OSC
  });
});

screens.on('connection', function (socket) {
  socket.emit('initialize', { 
    remoteIDs: Object.keys(remotes.sockets),
    address: `${ip.address()}:${port}`
  });
});


var osc = require("osc");

var udpPort = new osc.UDPPort({
    // This is the port we're listening on.
    localAddress: "localhost",
    localPort: 9000,

    // This is where Unity is listening for OSC messages.
    remoteAddress: "localhost",
    remotePort: 9001,
    metadata: true
});

// Open the socket.
udpPort.open();


// Listen for incoming OSC bundles.
udpPort.on("message", function (oscMsg) {
//    console.log("An OSC message just arrived!", oscMsg);
    if (oscMsg.address === "/pointingInUnity") {
        var id = oscMsg.args[0].value;
        var tag = oscMsg.args[1].value;

        console.log(id);
        console.log(tag);
    }
});


function sendTouching(remoteId, touching) {
    var msg = {
        address: "/unity/touching",
        args: [
            {
                type: "s",
                value: remoteId.split('#')[1] // /remote#ABCD!@#$ ==> ABCD!@#$
            },
            {
                type: "s", // send boolean as string
                value: touching 
            }
        ]
    };

    udpPort.send(msg);
}



function sendPosition(remoteId, position) {
    var msg = {
        address: "/unity/pointing",
        args: [
            {
                type: "s",
                value: remoteId.split('#')[1] // /remote#ABCD!@#$ ==> ABCD!@#$
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
    };

//    console.log("Sending message", msg.address, msg.args, "to", udpPort.options.remoteAddress + ":" + udpPort.options.remotePort);
    udpPort.send(msg);
}


