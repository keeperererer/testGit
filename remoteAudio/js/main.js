'use strict';

const audio2 = document.querySelector('audio#audio2');
const callButton = document.querySelector('button#callButton');
const hangupButton = document.querySelector('button#hangupButton');
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;

let pc1;
let pc2;
let localStream;

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0,
  voiceActivityDetection: false
};

// Enabling opus DTX is an expert option without GUI.
// eslint-disable-next-line prefer-const
let useDtx = false;

// Disabling Opus FEC is an expert option without GUI.
// eslint-disable-next-line prefer-const
let useFec = true;

// 打电话
function call() {
  //禁用拨打按钮
  callButton.disabled = true
  console.log('Starting call')
  const servers = null
  //RTCPeerConnection 接口代表一个由本地计算机到远端的WebRTC连接。
  //该接口提供了创建，保持，监控，关闭连接的方法的实现。
  pc1 = new RTCPeerConnection(servers)
  console.log('创建的本地对等连接对象pc1')
  // RTCPeerConnection 的属性 onicecandidate （是一个事件触发器 EventHandler） 能够让函数在事件icecandidate发生在实例
  //RTCPeerConnection 上时被调用。 只要本地代理ICE(交互式连接建立) 需要通过信令服务器传递信息给其他对等端时就会触发。
  pc1.onicecandidate = (e) => onIceCandidate(pc1, e)
  pc2 = new RTCPeerConnection(servers)
  console.log('创建的远程对等连接对象pc2')
  pc2.onicecandidate = (e) => onIceCandidate(pc2, e)
  //ontrack指定了在RTCPeerConnection接口上触发 track 事件时调用的方法
  pc2.ontrack = gotRemoteStream
  console.log('请求本地流')
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .then(gotStream)
    .catch((e) => {
      alert(`getUserMedia() error: ${e.name}`)
    })
}

// 获取本地流
function gotStream(stream) {
  hangupButton.disabled = false
  console.log('请求本地流')
  localStream = stream
  //getAudioTracks() 方法会返回一个包含 track（轨道） set 流中所有 MediaStreamTrack.kind 为 audio 的 MediaStreamTrack 对象序列。
  const audioTracks = localStream.getAudioTracks()
  if (audioTracks.length > 0) {
    console.log(`使用音频设备: ${audioTracks[0].label}`)
  }
  localStream.getTracks().forEach((track) => pc1.addTrack(track, localStream))
  console.log('向对等连接添加本地流')
  //createOffer()方法将RTCPeerConnection启动SDP产品的创建，以启动与远程对等方的新WebRTC连接。
  pc1
    .createOffer(offerOptions)
    .then(gotDescription1, onCreateSessionDescriptionError)
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function gotDescription1(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`)
  //方法setLocalDescription()更改与连接关联的本地描述。此描述指定连接本地端的属性，包括媒体格式。
  pc1.setLocalDescription(desc).then(() => {
    pc2.setRemoteDescription(desc).then(() => {
      return pc2
        .createAnswer()
        .then(gotDescription2, onCreateSessionDescriptionError)
    }, onSetSessionDescriptionError)
  }, onSetSessionDescriptionError)
}

function gotDescription2(desc) {
  console.log(`Answer from pc2\n${desc.sdp}`);
  pc2.setLocalDescription(desc).then(() => {
    // 一些描述信息
    if (useDtx) {
      desc.sdp = desc.sdp.replace('useinbandfec=1', 'useinbandfec=1;usedtx=1');
    }
    if (!useFec) {
      desc.sdp = desc.sdp.replace('useinbandfec=1', 'useinbandfec=0');
    }
    pc1.setRemoteDescription(desc).then(() => {}, onSetSessionDescriptionError);
  }, onSetSessionDescriptionError);
}

// 获取远程流
function gotRemoteStream(e) {
  if (audio2.srcObject !== e.streams[0]) {
    audio2.srcObject = e.streams[0];
    console.log('Received remote stream');
  }
}

// 挂电话
function hangup() {
  console.log('Ending call');
  localStream.getTracks().forEach(track => track.stop());
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}



function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

// 让函数在事件icecandidate发生在实例  RTCPeerConnection 上时被调用
function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
      .then(
          () => onAddIceCandidateSuccess(pc),
          err => onAddIceCandidateError(pc, err)
      );
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add ICE Candidate: ${error.toString()}`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}