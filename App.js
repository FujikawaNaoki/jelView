/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react';

import {
    StyleSheet,
    Dimensions,
    DeviceEventEmitter
} from 'react-native'

import {
    Container,
    Header,
    Content,
    Footer,
    FooterTab,
    Button,
    H1,
    Body,
} from 'native-base';

import {
    RTCPeerConnection,
    RTCMediaStream,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStreamTrack,
    getUserMedia,
} from 'react-native-webrtc';

import Icon from 'react-native-vector-icons/FontAwesome';
import InCallManager from 'react-native-incall-manager';

const rpi_host_name = "raspberrypi2.local";

const configuration = {"iceServers": [{"url": "stun:" + rpi_host_name + ":3478"}]};
const socketURL = "wss://" + rpi_host_name + ":8090" + "/stream/webrtc";
const mediaConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    }
};
let ws;
let pc;

const window = Dimensions.get('window');
const window_width = window.width;

export default class App extends Component<{}> {

    constructor() {
        super();
        this._onPlayPress = this._onPlayPress.bind(this);
        this._onStopPress = this._onStopPress.bind(this);
        this._createPeerConnection = this._createPeerConnection.bind(this);
        this._onStopPress = this._onStopPress.bind(this);

        this.state = {
            status: 'init',
            info: "Initializing",
            remoteViewSrc: null,
        };

        console.log(window_width );
        console.log(window_width * 0.5625);

        DeviceEventEmitter.addListener('Proximity', function (data) {

            // --- do something with events

            console.log("Proximity",data);
        });
    }

    componentDidMount(){
        InCallManager.start({media: 'audio'});
        InCallManager.setForceSpeakerphoneOn(true);
        InCallManager.setSpeakerphoneOn(true);

    }
    componentWillUnmount(){
        InCallManager.stop();
    }

    _createPeerConnection(){
        console.log("_createPeerConnection");

        pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = (event) => {
            console.log("onicecandidate");
            if (event.candidate) {
                const candidate = {
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                };
                const request = {
                    what: "addIceCandidate",
                    data: JSON.stringify(candidate)
                };
                console.log("addIceCandidate");
                ws.send(JSON.stringify(request));
            } else {
                console.log("End of candidates.");
            }
        };
        pc.onaddstream = (event) => {
            console.log('onaddstream', event.stream);
            this.setState({info: 'One peer join!',remoteViewSrc:event.stream.toURL()});
            console.log("event.stream.getAudioTracks()[0]",event.stream.getAudioTracks()[0]);
            //
            // let audioContext = new window.AudioContext();
            // console.log(audioContext);
            // audioContext.createAnalyser();
            //
        };
        pc.onremovestream = (event) =>{
            console.log('onremovestream', event.stream);
            this.setState({remoteViewSrc:null});
        };
        console.log("peer connection successfully created!");

    }

    _onPlayPress(event) {
        console.log("_onPlayPress");
        this.setState({status: 'ready', info: '接続準備中'});

        ws = new WebSocket(socketURL);

        ws.onopen = () => {
            // connection opened
            console.log("WebSocket","Connection opened");
            this._createPeerConnection();
            const request = {
                what: "call",
                options: {
                    force_hw_vcodec: false,
                    vformat: '60' //1280x720
                }
            };
            const message = JSON.stringify(request);
            console.log("WebSocket:call", message);
            this.setState({info: '接続要求送信'});
            ws.send(message);
        };

        ws.onmessage = (e) => {
            // a message was received
            console.log("WebSocket","a message was received");
            this.setState({info: '接続要求の返信受信中'});
            let received_msg = JSON.parse(e.data);
            const what = received_msg.what;
            const data = received_msg.data;

            switch (what) {
                case "offer":
                    console.log("####offer;data",data);
                    const arr = JSON.parse(data).sdp.split(/\r\n|\n/);
                    for (let i = 0; i < arr.length; i++){
                        console.log(arr[i]);
                    }
                    pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)),
                        () => {
                            console.log('onRemoteSdpSucces()');
                            pc.createAnswer(function (sessionDescription) {
                                pc.setLocalDescription(sessionDescription);
                                const request = {
                                    what: "answer",
                                    data: JSON.stringify(sessionDescription)
                                };
                                const sendMsg = JSON.stringify(request);
                                console.log("####anser;request;",sendMsg);
                                ws.send(sendMsg);

                            }, function (error) {
                                alert("Failed to createAnswer: " + error);
                            }, mediaConstraints);
                        },
                        (event) => {
                            alert('Failed to set remote description (unsupported codec on this browser?): ' + event);
                            this._onStopPress();
                        }
                    );
                    const request = JSON.stringify({
                        what: "generateIceCandidates"
                    });
                    console.log(request);
                    ws.send(request);
                    break;
                case "message":
                    console.log("####message;data",data);
                    alert(data);
                    break;
                case "iceCandidates":
                    console.log("####iceCandidates;data",data);
                    const candidates = JSON.parse(data);
                    for (let i = 0; candidates && i < candidates.length; i++) {
                        const elt = candidates[i];
                        const candidate = new RTCIceCandidate({
                            sdpMLineIndex: elt.sdpMLineIndex,
                            candidate: elt.candidate
                        });
                        pc.addIceCandidate(candidate,
                            function () {
                                console.log("IceCandidate added: " + JSON.stringify(candidate));
                            },
                            function (error) {
                                console.error("addIceCandidate error: " + error);
                            }
                        );
                    }
                    break;
                default:
                    console.log("WebSocket.onmessage","メッセージをハンドリングできません");
                    console.log("WebSocket.onmessage:what",what);
                    console.log("WebSocket.onmessage:data",data);
                    break;
            }

        };

        ws.onerror = (e) => {
            // an error occurred
            console.log("WebSocket","an error occurred");
            console.log(e.message);
        };

        ws.onclose = (e) => {
            // connection closed
            console.log("WebSocket","Connection closed");
            console.log(e.code, e.reason);

        };


        this.setState({status: 'connected', info: '接続中'});
    }

    _onStopPress(event) {
        this.setState({status: 'stop', info: 'Stopping'});
        if (pc) {
            pc.close();
            pc = null;
        }
        if (ws) {
            ws.close();
            ws = null;
        }
    }

    render() {
        console.log("render;",this.state);

        return (
            <Container>
                <Header/>
                <Content padder contentContainerStyle={styles.content}>
                    {this.state.status === 'connected' ?
                        <RTCView streamURL={this.state.remoteViewSrc} style={styles.rtc_view}/>
                        :
                        <Body><H1>{this.state.info}</H1></Body>
                    }
                </Content>
                <Footer>
                    <FooterTab>
                        <Button vertical onPress={this._onPlayPress}>
                            <Icon name="play" size={30} color="#900"/>
                        </Button>
                        <Button vertical onPress={this._onStopPress}>
                            <Icon name="stop" size={30} color="#900"/>
                        </Button>
                    </FooterTab>
                </Footer>
            </Container>
        );
    }
}

const styles = StyleSheet.create({
    content: {
        flex:1,
        justifyContent: 'center' ,
        alignItems: 'center',
        backgroundColor:"white",
        height:'100%'
    },
    rtc_view: {
        //backgroundColor:"blue",
        width: 400 ,
        height: 600,
    }
});