import React, { Component } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Button } from 'react-native';
import { TextInput, ScrollView } from 'react-native-gesture-handler';
import { Stitch, AnonymousCredential, RemoteMongoClient } from 'mongodb-stitch-react-native-sdk';
import { Header } from 'react-native-elements';

export default class App extends Component {
  state = {
    inputValue: '',
    bubbles: []
  }

  componentDidMount(){
    Stitch.initializeDefaultAppClient('wordbubble-app-vbwei').then(client => {
      this.setState({ 
        client,
        db: client
            .getServiceClient(RemoteMongoClient.factory, 'wordbubble-stitch')
            .db('wordbubble-db')
      });
      
      if(client.auth.isLoggedIn) {
        this.setState({ currentUserId: client.auth.user.id })
      }
    });
  }

  _onPressLogin = () => {
    this.state.client.auth.loginWithCredential(new AnonymousCredential()).then(user => {
        console.log(`Successfully logged in as user ${user.id}`);
        this.setState({ currentUserId: user.id })
    }).catch(err => {
        console.log(`Failed to log in anonymously: ${err}`);
        this.setState({ currentUserId: undefined })
    });
  }

  onChangeText = (inputValue) => {
    this.setState({
      inputValue
    })
  }

  onSubmitEdit = async () => {
    const {inputValue} = this.state
    if(!inputValue)
      return

    const wordsCollection = this.state.db.collection('words')
    let words = inputValue.split(' ')
    let wordsFromLast = words.reverse()

    let nextWord
    let bubbles = []

    this.setState({
      loading: true
    })
    
    for(let word of wordsFromLast){
      let update = {
        $set: {
          lastUsed: new Date()
        }
      }
      if(nextWord)
        update.$push = {
          nextWords: nextWord
        }

      await wordsCollection.updateOne(
        { word }, 
        update, 
        { upsert: true }
      )

      const currentWord = await wordsCollection.findOne({
        word
      })

      if(nextWord)
        currentWord.nextCount = currentWord.nextWords.length - 1
      else
        currentWord.nextCount = (currentWord.nextWords || []).length

      bubbles = [currentWord].concat(bubbles)

      nextWord = {...currentWord}
    }
    
    this.setState({
      bubbles,
      loading: false
    })
  }

  render() {
    const {inputValue, bubbles, currentUserId, loading} = this.state
    return (
      <>
      <Header
        leftComponent={{ icon: 'menu', color: '#fff' }}
        centerComponent={{ text: 'WordBubbles', style: { color: '#fff' } }}
        rightComponent={{ icon: 'home', color: '#fff' }}
      />
      <SafeAreaView style={styles.safeArea}>
        {
          currentUserId ? 
          <>
            <TextInput
              style={{ paddingLeft: 10, height: 40, borderColor: 'gray', borderWidth: 1 }}
              onChangeText={text => this.onChangeText(text)}
              value={inputValue}
              onSubmitEditing={this.onSubmitEdit}
              placeholder="Put your words here"
            />
            {
              loading ? 
              <Text>Bubbling...</Text> :
              <ScrollView style={styles.scrollView}>
                {
                  bubbles.map((bubble,index) => <View key={bubble.word + index} style={styles.row}>
                    <View style={styles.column}></View>
                    <View style={styles.centerColum}>
                      <Text style={styles.bubble}>{bubble.word}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text>{!!bubble.nextCount && `=> +${bubble.nextCount} words`}</Text>
                    </View>
                  </View>
                  )
                }
              </ScrollView>
            }
          </> : 
          <Button
          onPress={this._onPressLogin}
          title="Login"/>
        }
      </SafeAreaView>
      </>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    margin: 10,
  },
  scrollView: {
    
  },
  row: {
    flex: 1, 
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 10,
  },
  column: {
    flex: 1,
    width: '33%',
    alignItems: 'center'
  },
  bubble: {
    textAlign: 'center',
    borderWidth: 1,
    padding: 5,
    borderRadius: 5,
    flexWrap: 'wrap'
  },
  centerColum: {
    flex: 1, 
    alignItems: 'center',
    flexWrap: "wrap"
  }
});
