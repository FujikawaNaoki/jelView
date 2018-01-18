/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  View
} from 'react-native';
import { Container, Header, Content, Footer, Text } from 'native-base';


export default class App extends Component<{}> {
  render() {
    return (
        <Container>
            <Header />
            <Content padder>
                <Text>
                    This is Content Section
                </Text>
            </Content>
            <Footer />
        </Container>
    );
  }
}

