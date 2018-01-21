/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react';

import {
    Platform,
    StyleSheet,
    View,
    AppRegistry,
    TouchableHighlight,
    TextInput,
    ListView,
} from 'react-native'

import {
    Container,
    Header,
    Content,
    Footer,
    FooterTab,
    Button,
    Text,
    H1,
    Body,
} from 'native-base';

import io from 'socket.io-client';

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

const rpi_host_name = "raspberrypi.local";

const configuration = {"iceServers": [{"url": "stun:" + rpi_host_name + ":3478"}]};

export default class App extends Component<{}> {

    constructor() {
        super();
        this._onPlayPress = this._onPlayPress.bind(this);
        this._onStopPress = this._onStopPress.bind(this);

        this.state = {
            status: 'init',
            info: "Initializing",
            remoteViewSrc: null,
        };
    }

    _onPlayPress(event) {
        this.setState({status: 'ready', info: '接続準備中'});


        this.setState({status: 'connected', info: '接続中'});
    }

    _onStopPress(event) {
        this.setState({status: 'stop', info: 'Stopping'});
    }

    render() {
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
        // justifyContent: 'center' ,
        // alignItems: 'center',
        // backgroundColor:"white",
        //height:'100%'
    },
    rtc_view: {
        backgroundColor:"gray",
        //height:'100%'
    },
});