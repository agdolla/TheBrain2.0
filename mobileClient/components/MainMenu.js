import _ from 'lodash'
import React from 'react'
import { withRouter } from 'react-router'
import { compose, graphql, withApollo } from 'react-apollo'
import gql from 'graphql-tag'
import update from 'immutability-helper'
import { connect } from 'react-redux'

import { Animated, Dimensions, Image, Keyboard, Text, TouchableHighlight, View, AsyncStorage } from 'react-native'
import { FBLoginManager } from 'react-native-facebook-login'

import * as courseActions from '../actions/CourseActions'

import Separator from './Separator'
import Loading from './Loading'

import styles from '../styles/styles'
import appStyle from '../styles/appStyle'
import levelConfig from '../shared/helpers/levelConfig'

import currentUserQuery from '../shared/graphql/queries/currentUser'
import sessionCountQuery from '../shared/graphql/queries/sessionCount'
import userDetailsQuery from '../shared/graphql/queries/userDetails'
import WithData from './WithData'
import { mutationConnectionHandler } from './NoInternet'

const MenuButton = (props) => (
  <TouchableHighlight
    onPress={props.onPress}
    activeOpacity={1}
    underlayColor="#fff"
    style={styles.menuButton}
  >
    <Text style={styles.menuButtonText}>{props.text}</Text>
  </TouchableHighlight>
)

class MainMenu extends React.Component {
  state = {
    fadeAnim: new Animated.Value(0),
    loading: false
  }

  componentDidMount () {
    Animated.timing(
      this.state.fadeAnim,
      {
        toValue: 1,
        duration: 200
      }
    ).start()
  }

  logout = () => {
    console.log('>>>>>>>>>> LOGOUT')
    this.setState({ loading: true }, async () => {
      await AsyncStorage.removeItem('accessTokenFb')
      await AsyncStorage.removeItem('accessToken')
      await AsyncStorage.removeItem('userId')
      await AsyncStorage.removeItem('userIdFb')
      this.props.logout()
        .then(async () => {
          await this.props.userDetails.refetch()
          this.props.dispatch(courseActions.close())
          FBLoginManager.getCredentials((error, data) => {
            if (!error && data && data.credentials) {
              FBLoginManager.logout(() => {}) // any callback is required
            }
          })
          this.props.client.resetStore()
          this.props.toggleMainMenu && this.props.toggleMainMenu()
          this.props.logoutAction && this.props.logoutAction()
          this.setState({loading: false})
          this.props.history.push('/')
        })
        .catch(() => {
          this.props.toggleMainMenu && this.props.toggleMainMenu()
          this.setState({loading: false})
          this.history.push('/nointernet')
        })
    })
  }

  go = (path) => () => {
    this.props.history.push(path)
    this.props.toggleMainMenu && this.props.toggleMainMenu()
  }

  closeCourse = async () => {
    this.props.dispatch(courseActions.close())
    await this.props.closeCourse()
    this.go('/')()
  }

  render () {
    const height = Dimensions.get('window').height - this.props.topMargin

    if (this.state.loading || this.props.currentUser.loading || this.props.sessionCount.loading || this.props.userDetails.loading) {
      return <View style={[styles.headerWithShadow, styles.menuOverlay, {
        backgroundColor: '#fff',
        top: this.props.topMargin,
        justifyContent: 'space-between',
        height
      }]}>
        <Loading lightStyle={true} />
      </View>
    }
    let { fadeAnim } = this.state

    const currentUser = this.props.currentUser.CurrentUser
    const activated = currentUser && currentUser.activated
    const sessionCount = this.props.sessionCount.SessionCount
    const username = _.get(this.props, 'currentUser.CurrentUser.username', 'Guest')
    const userLevel = _.get(this.props, 'userDetails.UserDetails.experience.level', 1)
    const levelCap = levelConfig.levelCap
    const level = Math.min(userLevel, levelCap)

    Keyboard.dismiss()

    return (
      <Animated.View style={[styles.headerWithShadow, styles.menuOverlay, {
        backgroundColor: '#eee',
        opacity: fadeAnim,
        top: this.props.topMargin,
        justifyContent: 'space-between',
        height
      }]}>
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          flexDirection: 'row',
          width: '100%',
          height: '33%',
          backgroundColor: 'white',
        }}>
          <Image
            style={{ width: '25%', height: '85%', marginLeft: 20, resizeMode: 'contain' }}
            source={levelConfig[level].file}
          />
          {currentUser &&
          <View style={{
            width: '70%',
            padding: 20
          }}>
            <Text style={[styles.textDefault, { fontSize: 26, color: '#6905ea' }]}>
              {username}
            </Text>
            <View style={{ width: '100%', marginTop: 5, flexDirection: 'row' }}>
              <View style={{ width: '50%', padding: 10, alignItems: 'center' }}>
                <Text style={style.text}>DUE</Text>
                <Text style={style.textBold}>{sessionCount.dueDone}/{sessionCount.dueTotal}</Text>
                <View style={[style.card, { backgroundColor: '#4ba695' }]}/>
              </View>
              <View style={{ position: 'relative', width: 1, backgroundColor: '#999', zIndex: 1000 }}>
                <View style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: '#999'
                }}/>
                <View style={{
                  position: 'absolute',
                  bottom: -4,
                  left: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: '#999'
                }}/>
              </View>
              <View style={{ width: '50%', padding: 10, alignItems: 'center' }}>
                <Text style={style.text}>REVIEW</Text>
                <Text style={style.textBold}>{sessionCount.reviewDone}/{sessionCount.reviewTotal}</Text>
                <View style={[style.card, { backgroundColor: '#c64f34' }]}/>
              </View>
            </View>
          </View>
          }
        </View>
        <View style={{ marginBottom: '10%', marginTop: '3%', flex: 1, justifyContent: 'flex-start' }}>
          {activated
            ? <MenuButton text="LOG OUT" onPress={this.logout}/>
            : <MenuButton text="LOG IN" onPress={this.go('/login')}/>
          }
          <Separator />
          {currentUser &&
          <View>
            {this.props.selectedCourse ? <MenuButton text="LECTURES LIST" onPress={this.go('/lectures')}/> : null}
            {this.props.selectedCourse ? <Separator /> : null}

            <MenuButton text="REVIEWS CALENDAR" onPress={this.go('/calendar')}/>
            <Separator />
            {this.props.selectedCourse ? <MenuButton text="CHANGE THE COURSE"
                                                     onPress={this.props.closeCourse ? this.props.closeCourse : this.closeCourse}/> : null}
            {this.props.selectedCourse ? <Separator /> : null}
            {/*<MenuButton text="ACHIEVEMENTS LIST" onPress={this.go('/achievements')} />*/}
            {/*<Separator />*/}
            <MenuButton text="PROFILE" onPress={this.go('/profile')}/>
            <Separator />
          </View>
          }
          <MenuButton text="CONTACT" onPress={this.go('/contact')}/>
        </View>
      </Animated.View>
    )
  }
}

const style = {
  text: {
    color: '#999',
    fontFamily: 'Exo2-Regular'
  },
  textBold: {
    color: '#999',
    fontFamily: 'Exo2-Bold',
    fontSize: 18
  },
  card: {
    width: 20,
    height: 14,
    marginTop: 8
  }
}

MainMenu.defaultProps = {
  topMargin: appStyle.header.height
}

const logOutQuery = gql`
    mutation logOut {
        logOut {
            _id, username, activated, facebookId, currentAccessToken
        }
    }
`

const mapStateToProps = (state) => {
  return {
    selectedCourse: state.course.selectedCourse
  }
}

export default compose(
  withApollo,
  withRouter,
  connect(mapStateToProps),
  graphql(logOutQuery, {
    props: ({ ownProps, mutate }) => ({
      logout: () => mutate({
        updateQueries: {
          CurrentUser: (prev, { mutationResult }) => {
            return update(prev, {
              CurrentUser: {
                $set: mutationResult.data.logOut
              }
            })
          }
        }
      })
    })
  }),
  graphql(sessionCountQuery, {
    name: 'sessionCount',
    options: {
      fetchPolicy: 'network-only'
    }
  }),
  graphql(currentUserQuery, {
    name: 'currentUser',
  }),
  graphql(userDetailsQuery, {
    name: 'userDetails',
  })
)(WithData(MainMenu, ['currentUser', 'userDetails', 'sessionCount']))
