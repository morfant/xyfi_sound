
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

require('./post-css/remote.css');

var io = require('socket.io-client')('/remotes');

// import FULLTILT from '../fulltilt.js';
// const GyroNorm = require('../gyronorm.js').GyroNorm;

// The angle at which we stop listening for input from the phone's gyro.
var MAX_X_ANGLE = 20,
  MAX_Y_ANGLE = 24;

var position = [],
  latestAlpha,
  baseAlpha = null,
  touching = false;


var buttonToggle = false;
var intervalLoop = null;

// Using gyronorm if you need
/*
var gn = new GyroNorm();
gn.FULLTILT = FULLTILT;

var args = {
	frequency:50,					// ( How often the object sends the values - milliseconds )
	gravityNormalized:true,			// ( If the gravity related values to be normalized )
	orientationBase:GyroNorm.GAME,		// ( Can be GyroNorm.GAME or GyroNorm.WORLD. gn.GAME returns orientation values with respect to the head direction of the device. gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
	decimalCount:2,					// ( How many digits after the decimal point will there be in the return values )
	logger:null,					// ( Function to be called to log messages from gyronorm.js )
	screenAdjusted:false			// ( If set to true it will return screen adjusted values. )
};

gn.init().then(function(){
  gn.start(function(data){
    // Process:
    console.log("gn start()")
    var alpha, beta, gamma, abs, ax, ay, az, gx, gy, gz, rx, ry, rz;
    alpha = data.do.alpha	// ( deviceorientation event alpha value )
    beta = data.do.beta		// ( deviceorientation event beta value )
    gamma = data.do.gamma	// ( deviceorientation event gamma value )
    abs = data.do.absolute	// ( deviceorientation event absolute value )

    ax = data.dm.x		//( devicemotion event acceleration x value )
    ay = data.dm.y		//( devicemotion event acceleration y value )
    az = data.dm.z		//( devicemotion event acceleration z value )

    gx = data.dm.gx		//( devicemotion event accelerationIncludingGravity x value )
    gy = data.dm.gy		//( devicemotion event accelerationIncludingGravity y value )
    gz = data.dm.gz		//( devicemotion event accelerationIncludingGravity z value )

    rx = data.dm.alpha //( devicemotion event rotationRate alpha value )
    ry = data.dm.beta		//( devicemotion event rotationRate beta value )
    rz = data.dm.gamma	//( devicemotion event rotationRate gamma value )

    position[0] = alpha;
    position[1] = beta;
    position[2] = gamma;
    position[3] = abs;
    position[4] = ax;
    position[5] = ay;
    position[6] = az;
    position[7] = gx;
    position[8] = gy;
    position[9] = gz;
    position[10] = rx;
    position[11] = ry;
    position[12] = rz;
  });
}).catch(function(e){
  // Catch if the DeviceOrientation or DeviceMotion is not supported by the browser or device
});
*/

// Convert the phone's gyro data into screen coordinates.
function handleDeviceOrientation(data) {

  // console.log("handleDeviceOrientation()")
  // io.emit('llog', "hello")

  var x, y,
    alpha = latestAlpha = data.alpha,
    beta = data.beta;

  if (baseAlpha !== null) {
    alpha = alpha - baseAlpha;
    alpha += 360;
    alpha %= 360;
  }

  // Left/right rotation.
  if (alpha > 360 - MAX_X_ANGLE) {

    // phone is rotating right:
    x = 100 / MAX_X_ANGLE * (360 - alpha);
  } else if (alpha < MAX_X_ANGLE) {

    // phone is rotating left:
    x = 100 / MAX_X_ANGLE * (0 - alpha);
  } else {

    // Stop rotation at max angle.
    if (alpha > MAX_X_ANGLE && alpha < 180) {
      x = -100;
    } else {
      x = 100;
    }
  }

  // Up/down rotation.
  if (beta > 0 && beta <= MAX_Y_ANGLE
    || beta < 0 && beta >= MAX_Y_ANGLE * -1) {
    y = 100 / MAX_Y_ANGLE * (beta * -1);
  } else {
    if (beta > 0) {
      y = -100;
    } else {
      y = 100;
    }
  }

  // Normalize percentages to from (0, 100) to (0, 1):
  x *= 0.01;
  y *= 0.01;

  position[0] = x;
  position[1] = y;

}

// function iologging(data) {
//   io.emit('log', data)
// }


function handleTouchStartEvent(e) {

  e.preventDefault();
  // io.emit('log', e)

  if (e.target.id === "bigTouch") {
    if (!touching){
      touching = true
      io.emit('touching', touching);
      $('#bigTouch').addClass("touching")
    }
  } else if (e.target.id === "connect") {
    if (buttonToggle === false) {
      buttonToggle = true

      $('#connect').removeClass("btn-primary")
      $('#connect').addClass("btn-success")
      $('#connect').html("Pointing On")
      togglePointing()

    } else {
      buttonToggle = false
      $('#connect').removeClass("btn-success")
      $('#connect').addClass("btn-primary")
      $('#connect').html("Connect")

    }
  }

}

function handleTouchEndEvent(e) {
  e.preventDefault();

  if (e.target.id === "bigTouch") {
    touching = false;
    io.emit('touching', touching);
    $('#bigTouch').removeClass("touching")
  } else if (e.target.id == "connect") {

  }

  // make sound on mobile test
  // var pos = document.getElementById("pos");
  // pos.innerHTML = position;

  // var synth = new Tone.Synth().toMaster();
  // synth.triggerAttackRelease(Math.abs(position[0]*500), "8n");
}


function update() {
  //if (buttonToggle) {
    io.emit('position', position);
  //}
}

/*
$('#connect').on('click touch', function() {
  if (buttonToggle === false) {
    buttonToggle = true

    $('#connect').removeClass("btn-primary")
    $('#connect').addClass("btn-success")
    $('#connect').html("Pointing On")
    togglePointing()

  } else {
    buttonToggle = false
    $('#connect').removeClass("btn-success")
    $('#connect').addClass("btn-primary")
    $('#connect').html("Connect")

  }

})
*/

function togglePointing () {
  baseAlpha = latestAlpha;

  intervalLoop = setInterval(function() {

    update();

    if (buttonToggle == false) {
      clearInterval(intervalLoop)
    }

  }, 50); // update rate

}




// We need to check for DeviceOrientation support because some devices do not
// support it. For example, phones with no gyro.
if (window.DeviceOrientationEvent) {

  // *** It needs to be worked with HTTPS(not HTTP) server to access this event on IOS ***
  window.addEventListener('deviceorientation', handleDeviceOrientation, false);

  window.addEventListener('touchstart', handleTouchStartEvent, {
      capture: true,
      passive: false
    }
  );

  window.addEventListener('mousedown', handleTouchStartEvent, {
      capture: true,
      passive: false
    }
  );

  window.addEventListener('touchend', handleTouchEndEvent, {
      capture: true,
      passive: false
    }
  );

  window.addEventListener('mouseup', handleTouchEndEvent, {
      capture: true,
      passive: false
    }
  );

} else {
  alert('This device is not supported.');
}
