'use strict';

var isInitiator = false;

var configuration = null;

/****************************************************************************
* UI Initialization - Start
****************************************************************************/
// var roomURL = document.getElementById('url');
var video = document.querySelector('video');
var photo = document.getElementById('photo');
var photoContext = photo.getContext('2d');
var trail = document.getElementById('trail');
var snapBtn = document.getElementById('snap');
var sendBtn = document.getElementById('send');
var snapAndSendBtn = document.getElementById('snapAndSend');
/****************************************************************************
* UI Initialization - End
****************************************************************************/

var photoContextW;
var photoContextH;

/****************************************************************************
* UI Event Handling - Start
****************************************************************************/
// Attach event handlers
snapBtn.addEventListener('click', snapPhoto);
sendBtn.addEventListener('click', sendPhoto);
snapAndSendBtn.addEventListener('click', snapAndSend);

window.room = prompt("Enter room name:");
/****************************************************************************
* UI Event Handling - End
****************************************************************************/

/****************************************************************************
* Signaling server -Start
****************************************************************************/
var SIGNALINGSERVER = 'http://54.186.253.62:8080';

var socket = io.connect(SIGNALINGSERVER);

if (room !== "") {
  console.log('Message from client: Asking to join room ' + room);
  //socket.emit('create or join', room);
  //socket.emit('createroom', room);
  
  //commpac-server_room_create_or_join
  socket.emit('commpac server room create or join', room);
  // io.connect(SIGNALINGSERVER).emit('create or join', {
  //           room: room
  //       });
}



socket.on('created', function(room, clientId) {
  isInitiator = true;
  console.log('Created room', room, '- my client ID is', clientId);
  //grabWebCamVideo();
  createPeerConnection(isInitiator, configuration);
});

socket.on('full', function(room) {
  console.log('Message from client: Room ' + room + ' is full :^(');
});

socket.on('ipaddr', function(ipaddr) {
  console.log('Message from client: Server IP address is ' + ipaddr);
});

socket.on('joined', function(room, clientId) {
  isInitiator = false;
  console.log('This peer has joined room', room, 'with client ID', clientId);
  //grabWebCamVideo();
  createPeerConnection(isInitiator, configuration);
});

socket.on('ready', function() {
  console.log('Socket is ready');
  createPeerConnection(isInitiator, configuration);
});

var myRoom;
var myCliendId;

socket.on('commpac room joined', function(message) {
  console.log('on-commpac room joined',message);
  myRoom = message.room;
  myCliendId = message.clientid;
  console.log('on-commpac room joined details',myRoom,myCliendId);
  
});

socket.on('commpac room created', function(message) {
  console.log('on-commpac room created',message);
  myRoom = message.room;
  myCliendId = message.clientid;
  console.log('on-commpac room created details',myRoom,myCliendId);
});

socket.on('commpac client server client ready', function(message,message2) {
  console.log('on-commpac client server client ready',message,message2);
  
});


socket.on('commpac client message', function(message) {
  console.log('on-commpac client message',message)
  if(message.room===myRoom && message.clientid===myCliendId){
    signalingMessageCallback(message.content);
  }
  
  });

socket.on('message', function(message) {
  console.log('Client received message with type', message.type);
  console.log('Client received message', message);
  if(message.candidate){
    console.log('Client received message type candidate');
  }
  signalingMessageCallback(message);
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

function sendMessageToRemote(message) {
  console.log('Client sending message with type ', message.type);
  var messageToSend = {room:myRoom,clientid:myCliendId,content:message,from:'client'};
  socket.emit('commpac server message', messageToSend);
}

/**
* Send message to signaling server
*/
function sendMessage(message) {
  console.log('Client sending message with type ', message.type);
  socket.emit('message', message);
}

/****************************************************************************
* Signaling server - End
****************************************************************************/


/****************************************************************************
* WebRTC peer connection and data channel - Start
****************************************************************************/

var peerConn;
var dataChannel;

function signalingMessageCallback(message) {
  if (message.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);
    peerConn.createAnswer(onLocalSessionCreated, logError);

  } else if (message.type === 'answer') {
    console.log('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);

  } else if (message.type === 'candidate') {
    console.log('Got offer. Sending answer to peer.', {
      candidate: message.candidate
    });
    peerConn.addIceCandidate(new RTCIceCandidate({
      candidate: message.candidate
    }));

  } else if (message.candidate) {
    console.log('Got offer. Sending answer to peer.', {
      candidate: message.candidate
    });
    peerConn.addIceCandidate(new RTCIceCandidate(
      message.candidate
    ));
  }else if (message === 'bye') {
    // TODO: cleanup RTC connection?
  }
}

function createPeerConnection(isInitiator, config) {
  	console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
              config);
  	peerConn = new RTCPeerConnection(config);

	// send any ice candidates to the other peer
	peerConn.onicecandidate = function(event) {
	  console.log('icecandidate event:', event);
	  if (event.candidate) {
	    // sendMessage({"candidate" :{
     //    candidate: event.candidate.candidate,
	    //   sdpMLineIndex: event.candidate.sdpMLineIndex,
	    //   sdpMid: event.candidate.sdpMid
	    // }});

            //sendMessage({"candidate" : event.candidate});
            sendMessageToRemote({"candidate" : event.candidate});
      

      //  sendMessage({
      //   type: 'candidate',
      //   label: event.candidate.sdpMLineIndex,
      //   id: event.candidate.sdpMid,
      //   candidate: event.candidate.candidate
      // });
      // var cand = JSON.parse(event.candidate.candidate);
      //  sendMessage({
      //   type: 'candidate',
      //   candidate: cand
      // });
      //sendMessage(event.candidate);
	  } else {
	    console.log('End of candidates.');
	  }
	};

	if (isInitiator) {
	  console.log('Creating Data Channel');
    var channelName = myRoom + 'commpac' + myCliendId;
    dataChannel = peerConn.createDataChannel(channelName);
	  //dataChannel = peerConn.createDataChannel('photos');
	  onDataChannelCreated(dataChannel);

	  console.log('Creating an offer');
	  peerConn.createOffer(onLocalSessionCreated, logError);
	} else {
	  peerConn.ondatachannel = function(event) {
	    console.log('ondatachannel:', event.channel);
	    dataChannel = event.channel;
	    onDataChannelCreated(dataChannel);
	  };
	}
}

function onLocalSessionCreated(desc) {
  console.log('local session created:', desc);
  peerConn.setLocalDescription(desc, function() {
    console.log('sending local desc:', peerConn.localDescription);
    //sendMessage(peerConn.localDescription);
    sendMessageToRemote(peerConn.localDescription);
  }, logError);
}

function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  channel.onopen = function() {
    var toSend = Math.random();
    console.log('CONNECT and Send' + toSend);
    dataChannel.send('whatever' + toSend);
  };

  //channel.onmessage = (adapter.browserDetails.browser === 'firefox') ?
  //receiveDataFirefoxFactory() : receiveDataChromeFactory();

  channel.onmessage = function(event) {
    console.log('Received' + event.data);
    var deStr = Utf8ArrayToStr(event.data);
    console.log('Received str' + deStr);
  };
}

function stringToUint(string) {
    var string = btoa(unescape(encodeURIComponent(string))),
        charList = string.split(''),
        uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    return new Uint8Array(uintArray);
}

function uintToString(uintArray) {
    var encodedString = String.fromCharCode.apply(null, uintArray),
        decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
}

function Utf8ArrayToStr(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
    c = array[i++];
    switch(c >> 4)
    { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
    }

    return out;
}

function receiveDataChromeFactory() {
  var buf, count;

  return function onmessage(event) {
    if (typeof event.data === 'string') {
      buf = window.buf = new Uint8ClampedArray(parseInt(event.data));
      count = 0;
      console.log('Expecting a total of ' + buf.byteLength + ' bytes');
      return;
    }

    var data = new Uint8ClampedArray(event.data);
    buf.set(data, count);

    count += data.byteLength;
    console.log('count: ' + count);

    if (count === buf.byteLength) {
// we're done: all data chunks have been received
console.log('Done. Rendering photo.');
renderPhoto(buf);
}
};
}

function receiveDataFirefoxFactory() {
  var count, total, parts;

  return function onmessage(event) {
    if (typeof event.data === 'string') {
      total = parseInt(event.data);
      parts = [];
      count = 0;
      console.log('Expecting a total of ' + total + ' bytes');
      return;
    }

    parts.push(event.data);
    count += event.data.size;
    console.log('Got ' + event.data.size + ' byte(s), ' + (total - count) +
                ' to go.');

    if (count === total) {
      console.log('Assembling payload');
      var buf = new Uint8ClampedArray(total);
      var compose = function(i, pos) {
        var reader = new FileReader();
        reader.onload = function() {
          buf.set(new Uint8ClampedArray(this.result), pos);
          if (i + 1 === parts.length) {
            console.log('Done. Rendering photo.');
            renderPhoto(buf);
          } else {
            compose(i + 1, pos + this.result.byteLength);
          }
        };
        reader.readAsArrayBuffer(parts[i]);
      };
      compose(0, 0);
    }
  };
}
/****************************************************************************
* WebRTC peer connection and data channel - End
****************************************************************************/

/****************************************************************************
* Aux functions, mostly UI-related - Start
****************************************************************************/

function snapPhoto() {
  //socket.emit('create server client', room);
  socket.emit('commpac server create peer connection', {room:myRoom,clientid:myCliendId});

  // photoContext.drawImage(video, 0, 0, photo.width, photo.height);
  // show(photo, sendBtn);
}

function sendPhoto() {
   var toSend = Math.random();
    console.log('CONNECT and Send' + toSend);
    dataChannel.send('whatever' + toSend);
// Split data channel message in chunks of this byte length.
// var CHUNK_LEN = 64000;
// console.log('width and height ', photoContextW, photoContextH);
// var img = photoContext.getImageData(0, 0, photoContextW, photoContextH),
// len = img.data.byteLength,
// n = len / CHUNK_LEN | 0;

// console.log('Sending a total of ' + len + ' byte(s)');
// dataChannel.send(len);

// // split the photo and send in chunks of about 64KB
// for (var i = 0; i < n; i++) {
//   var start = i * CHUNK_LEN,
//   end = (i + 1) * CHUNK_LEN;
//   console.log(start + ' - ' + (end - 1));
//   dataChannel.send(img.data.subarray(start, end));
// }

// // send the reminder, if any
// if (len % CHUNK_LEN) {
//   console.log('last ' + len % CHUNK_LEN + ' byte(s)');
//   dataChannel.send(img.data.subarray(n * CHUNK_LEN));
// }
}

function snapAndSend() {
  isInitiator = true;
  console.log('create peer conn');
  //grabWebCamVideo();
  createPeerConnection(isInitiator, configuration);

  //snapPhoto();
  //sendPhoto();
}

function renderPhoto(data) {
  var canvas = document.createElement('canvas');
  canvas.width = photoContextW;
  canvas.height = photoContextH;
  canvas.classList.add('incomingPhoto');
  // trail is the element holding the incoming images
  trail.insertBefore(canvas, trail.firstChild);

  var context = canvas.getContext('2d');
  var img = context.createImageData(photoContextW, photoContextH);
  img.data.set(data);
  context.putImageData(img, 0, 0);
}

function show() {
  Array.prototype.forEach.call(arguments, function(elem) {
    elem.style.display = null;
  });
}

function hide() {
  Array.prototype.forEach.call(arguments, function(elem) {
    elem.style.display = 'none';
  });
}

function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError(err) {
  console.log(err.toString(), err);
}

/****************************************************************************
* Aux functions, mostly UI-related - End
****************************************************************************/

/****************************************************************************
* User media (webcam) - Start
****************************************************************************/

function grabWebCamVideo() {
  console.log('Getting user media (video) ...');
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  var streamURL = window.URL.createObjectURL(stream);
  console.log('getUserMedia video stream URL:', streamURL);
  window.stream = stream; // stream available to console
  video.src = streamURL;
  video.onloadedmetadata = function() {
    photo.width = photoContextW = video.videoWidth;
    photo.height = photoContextH = video.videoHeight;
    console.log('gotStream with with and height:', photoContextW, photoContextH);
  };
  show(snapBtn);
}

/****************************************************************************
* User media (webcam) - End
****************************************************************************/