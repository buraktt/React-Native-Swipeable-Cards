/* Gratefully copied from https://github.com/brentvatne/react-native-animated-demo-tinder */
'use strict';

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  Dimensions,
  Image
} from 'react-native';

import clamp from 'clamp';
const { width, height } = Dimensions.get('window')
import Defaults from './Defaults.js';

const SWIPE_THRESHOLD = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  overlayRightWrapper: {
    position: 'absolute',
    top: 75,
    left: 20,
    backgroundColor: 'transparent',
    padding: 10,
    zIndex: 2,
  },
  overlayRightText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#05C148',
  },
  overlayUpWrapper: {
    position: 'absolute',
    padding: 20,
    bottom: 20,
    right: 20,
  },
  overlayUpText: {
    fontSize: 16,
    color: 'blue',
  },
  overlayLeftWrapper: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 75,
    right: 20,
    padding: 10,
    zIndex: 2,
  },
  overlayLeftText: {
    fontSize: 40,
    backgroundColor: 'transparent',
    textAlign: 'right',
    color: 'red',
    fontWeight: 'bold'
  },
  card: {
    flex: 1,
    margin: 0,
    padding: 0
    // position: 'absolute',
  }
});

//Components could be unloaded and loaded and we will loose the users currentIndex, we can persist it here.
let currentIndex = {};
let guid = 0;

export default class SwipeCards extends Component {

  static propTypes = {
    cards: PropTypes.array,
    cardKey: PropTypes.string,
    swipeUp: PropTypes.bool,
    loop: PropTypes.bool,
    onLoop: PropTypes.func,
    allowGestureTermination: PropTypes.bool,
    stack: PropTypes.bool,
    stackGuid: PropTypes.string,
    stackDepth: PropTypes.number,
    stackOffsetX: PropTypes.number,
    stackOffsetY: PropTypes.number,
    renderNoMoreCards: PropTypes.func,
    showRightOverlay: PropTypes.bool,
    showUpOverlay: PropTypes.bool,
    showLeftOverlay: PropTypes.bool,
    onSwipeRight: PropTypes.func,
    onSwipeUp: PropTypes.func,
    onSwipeLeft: PropTypes.func,
    overlayRightText: PropTypes.string,
    overlayRightWrapper: PropTypes.object,
    overlayRight: PropTypes.element,
    overlayUpText: PropTypes.string,
    overlayUp: PropTypes.element,
    overlayLeftText: PropTypes.string,
    overlayLeft: PropTypes.element,
    onClickHandler: PropTypes.func,
    renderCard: PropTypes.func,
    cardRemoved: PropTypes.func,
    dragY: PropTypes.bool,
    smoothTransition: PropTypes.bool,
    keyExtractor: PropTypes.func,
    rotation: PropTypes.bool,
    overlayUpTextStyle: PropTypes.object,
    overlayRightTextStyle: PropTypes.object,
    overlayUpWrapper: PropTypes.object,
    overlayLeftTextStyle: PropTypes.object,
    overlayLeftWrapper: PropTypes.object,
    cardStyle: PropTypes.object
  };

  static defaultProps = {
    cards: [],
    cardKey: 'key',
    swipeUp: false,
    loop: false,
    onLoop: () => null,
    allowGestureTermination: true,
    stack: false,
    stackDepth: 2,
    stackOffsetX: 0,
    stackOffsetY: 0,
    showRightOverlay: true,
    showUpOverlay: false,
    showLeftOverlay: true,
    onSwipeRight: (card) => null,
    onSwipeUp: (card) => null,
    onSwipeLeft: (card) => null,
    overlayLeftText: "Dislike",
    overlayUpText: "Maybe!",
    overlayRightText: "Like!",
    onClickHandler: null,
    onDragStart: () => { },
    onDragRelease: () => { },
    cardRemoved: (ix) => null,
    renderCard: (card) => null,
    style: styles.container,
    dragY: true,
    smoothTransition: false,
    keyExtractor: null,
    rotation: true,
    overlayRightTextStyle: null,
    overlayRightWrapper: null,
    overlayRight: null,
    overlayUpTextStyle: null,
    overlayLeftWrapper: null,
    overlayUpWrapper: null,
    cardStyle: null
  };

  constructor(props) {
    super(props);

    //Use a persistent variable to track currentIndex instead of a local one.
    this.guid = this.props.guid || guid++;
    if (!currentIndex[this.guid]) currentIndex[this.guid] = 0;

    this.state = {
      pan: new Animated.ValueXY(0),
      enter: new Animated.Value(0.5),
      cards: [].concat(this.props.cards),
      card: this.props.cards[currentIndex[this.guid]],
      viewMode: Dimensions.get('window').height > 500 ? 'portrait' : 'landscape',
      height: Dimensions.get('window').height,
      width: Dimensions.get('window').width
    };

    Dimensions.addEventListener('change', this.detectOrientation)

    this.lastX = 0;
    this.lastY = 0;

    this.cardAnimation = null;
    this._panResponder = {}
    // this._panResponder = PanResponder.create({
    //   onMoveShouldSetPanResponderCapture: (e, gestureState) => {
    //     if (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3) {
    //       this.props.onDragStart();
    //       return true;
    //     }
    //     return false;
    //   },

    //   onPanResponderGrant: (e, gestureState) => {
    //     this.state.pan.setOffset({ x: this.state.pan.x._value, y: this.state.pan.y._value });
    //     this.state.pan.setValue({ x: 0, y: 0 });
    //   },

    //   onPanResponderTerminationRequest: (evt, gestureState) => this.props.allowGestureTermination,

    //   onPanResponderMove: Animated.event([
    //     null, { dx: this.state.pan.x, dy: this.props.dragY ? this.state.pan.y : 0 },
    //   ]),

    //   onPanResponderRelease: (e, { vx, vy, dx, dy }) => {
    //     this.props.onDragRelease()
    //     this.state.pan.flattenOffset();
    //     let velocity;
    //     if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5)   //meaning the gesture did not cover any distance
    //     {
    //       this.props.onClickHandler(this.state.card)
    //     }

    //     if (vx > 0) {
    //       velocity = clamp(vx, 3, 5);
    //     } else if (vx < 0) {
    //       velocity = clamp(vx * -1, 3, 5) * -1;
    //     } else {
    //       velocity = dx < 0 ? -3 : 3;
    //     }

    //     const hasSwipedHorizontally = Math.abs(this.state.pan.x._value) > SWIPE_THRESHOLD
    //     const hasSwipedVertically = Math.abs(this.state.pan.y._value) > SWIPE_THRESHOLD
    //     if (hasSwipedHorizontally || (hasSwipedVertically && this.props.swipeUp)) {

    //       let cancelled = false;

    //       const hasMovedRight = hasSwipedHorizontally && this.state.pan.x._value > 0
    //       const hasMovedLeft = hasSwipedHorizontally && this.state.pan.x._value < 0
    //       const hasMovedUp = hasSwipedVertically && this.state.pan.y._value < 0

    //       if (hasMovedRight) {
    //         cancelled = this.props.onSwipeRight(this.state.card);
    //       } else if (hasMovedLeft) {
    //         cancelled = this.props.onSwipeLeft(this.state.card);
    //       } else if (hasMovedUp && this.props.swipeUp) {
    //         cancelled = this.props.onSwipeUp(this.state.card);
    //       } else {
    //         cancelled = true
    //       }

    //       //Yup or nope was cancelled, return the card to normal.
    //       if (cancelled) {
    //         this._resetPan();
    //         return;
    //       };

    //       this.props.cardRemoved(currentIndex[this.guid]);

    //       if (this.props.smoothTransition) {
    //         this._advanceState();
    //       } else {
    //         this.cardAnimation = Animated.decay(this.state.pan, {
    //           velocity: { x: velocity, y: vy },
    //           deceleration: 0.98,
    //           useNativeDriver: true
    //         });
    //         this.cardAnimation.start(status => {
    //           if (status.finished) this._advanceState();
    //           else this._resetState();

    //           this.cardAnimation = null;
    //         }
    //         );
    //       }

    //     } else {
    //       this._resetPan();
    //     }
    //   }
    // });
  }


  componentWillUnmount() {
    Dimensions.removeEventListener('change', this.detectOrientation)
  }

  detectOrientation = () => {
    this.setState({
      viewMode: Dimensions.get('window').height > 500 ? 'portrait' : 'landscape',
      height: Dimensions.get('window').height,
      width: Dimensions.get('window').width
    })
  }

  _forceLeftSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: -500, y: 0 },
    }).start(status => {
      if (status.finished) this._advanceState();
      else this._resetState();

      this.cardAnimation = null;
    }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _forceUpSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: 0, y: 500 },
    }).start(status => {
      if (status.finished) this._advanceState();
      else this._resetState();

      this.cardAnimation = null;
    }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _forceRightSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: 500, y: 0 },
    }).start(status => {
      if (status.finished) this._advanceState();
      else this._resetState();

      this.cardAnimation = null;
    }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _goToNextCard() {
    currentIndex[this.guid]++;

    // Checks to see if last card.
    // If props.loop=true, will start again from the first card.
    if (currentIndex[this.guid] > this.state.cards.length - 1 && this.props.loop) {
      this.props.onLoop();
      currentIndex[this.guid] = 0;
    }

    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  _goToPrevCard() {
    this.state.pan.setValue({ x: 0, y: 0 });
    this.state.enter.setValue(0);
    this._animateEntrance();

    currentIndex[this.guid]--;

    if (currentIndex[this.guid] < 0) {
      currentIndex[this.guid] = 0;
    }

    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  componentDidMount() {
    this._animateEntrance();
  }

  _animateEntrance() {
    Animated.spring(
      this.state.enter,
      {
        toValue: 1,
        friction: 7,
        tension: 40,
        duration: 350,
        useNativeDriver: true
      }
    ).start();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.cards !== this.props.cards) {

      if (this.cardAnimation) {
        this.cardAnimation.stop();
        this.cardAnimation = null;
      }

      currentIndex[this.guid] = 0;
      this.setState({
        cards: [].concat(nextProps.cards),
        card: nextProps.cards[0]
      });
    }
  }

  _resetPan() {
    Animated.spring(this.state.pan, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: true
    }).start();
  }

  _resetState() {
    this.state.pan.setValue({ x: 0, y: 0 });
    this.state.enter.setValue(0);
    this._animateEntrance();
  }

  _advanceState() {
    this.state.pan.setValue({ x: 0, y: 0 });
    this.state.enter.setValue(0);
    this._animateEntrance();
    this._goToNextCard();
  }

  /**
   * Returns current card object
   */
  getCurrentCard() {
    return this.state.cards[currentIndex[this.guid]];
  }

  renderNoMoreCards() {
    if (this.props.renderNoMoreCards) {
      return this.props.renderNoMoreCards();
    }

    return <Defaults.NoMoreCards />;
  }

  /**
   * Renders the cards as a stack with props.stackDepth cards deep.
   */
  renderStack() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }

    //Get the next stack of cards to render.
    let cards = this.state.cards.slice(currentIndex[this.guid], currentIndex[this.guid] + this.props.stackDepth).reverse();
    let cardStyle = { width: this.state.viewMode === 'portrait' ? this.state.width - 50 : this.state.width * .8, height: this.state.viewMode === 'portrait' ? this.state.height * .8 : this.state.height - 100 }
    return cards.map((card, i) => {

      let offsetX = this.props.stackOffsetX * cards.length - i * this.props.stackOffsetX;
      let lastOffsetX = offsetX + this.props.stackOffsetX;

      let offsetY = this.props.stackOffsetY * cards.length - i * this.props.stackOffsetY;
      let lastOffsetY = offsetY + this.props.stackOffsetY;

      let opacity = 0.25 + (0.75 / cards.length) * (i + 1);
      let lastOpacity = 0.25 + (0.75 / cards.length) * i;

      let scale = 0.85 + (0.15 / cards.length) * (i + 1);
      let lastScale = 0.85 + (0.15 / cards.length) * i;

      let style = {
        position: 'absolute',
        // top: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastOffsetY, offsetY] }),
        // left: this.state.enter.interpolate({ inputRange: [0, 31], outputRange: [lastOffsetX * this.props.x, offsetX * this.props.x] }),
        opacity: this.props.smoothTransition ? 1 : this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastOpacity, opacity] }),
        transform: [{ scale: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastScale, scale] }) }],
        elevation: i * 10
      };
      const key = this.getCardKey(card, i)
      //Is this the top card?  If so animate it and hook up the pan handlers.
      if (i + 1 === cards.length) {
        let { pan } = this.state;
        let [translateX, translateY] = [pan.x, pan.y];

        let rotate = this.props.rotation ? pan.x.interpolate({ inputRange: [-this.state.width / 2, 0, this.state.width / 2], outputRange: ["-10deg", "0deg", "10deg"] }) : '0deg';
        let opacity = this.props.smoothTransition ? 1 : pan.x.interpolate({ inputRange: [-this.state.width / 2, -this.state.width / 3, 0, this.state.width / 3, this.state.width / 2], outputRange: [0.3, .6, 1, .6, 0.3]});

        let animatedCardStyles = {
          ...style,
          opacity: opacity,
          transform: [
            { translateX: translateX },
            { translateY: translateY },
            { rotate: rotate },
            { scale: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastScale, scale] }) }
          ]
        };

        return <Animated.View key={key} style={[styles.card, animatedCardStyles, cardStyle, this.props.cardStyle, { left: this.props.x, top: this.props.y, right: this.props.x, bottom: this.props.y  }]} {... this._panResponder.panHandlers}>
          {this.renderLeftOverlay()}
          {this.renderRightOverlay()}
          {this.props.renderCard(this.state.card)}
        </Animated.View>;
      }

      return <Animated.View key={key} style={[style, styles.card, cardStyle, this.props.cardStyle, { left: this.props.x, top: this.props.y * 2, right: this.props.x, bottom: this.props.y }]}>{this.props.renderCard(card)}</Animated.View>;
    });
  }

  renderCard() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }
    let cardStyle = { width: this.state.viewMode === 'portrait' ? this.state.width  : this.state.width * .8, height: this.state.viewMode === 'portrait' ? this.state.height * .8 : this.state.height - 50 }
    const key = this.getCardKey(this.state.card)

    let { pan, enter } = this.state;
    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({ inputRange: [-width / 2, 0, this.state.width / 2], outputRange: ["-10deg", "0deg", "10deg"] });
    let opacity = this.props.smoothTransition ? 1 : pan.x.interpolate({ inputRange: [-this.state.width / 2, -width / 3, 0, this.state.width / 3, this.state.width / 2], outputRange: [0.8, 1, 1, 1, 0.8], extrapolate: 'clamp' });

    let scale = enter;

    let animatedCardStyles = { transform: [{ translateX }, { translateY }, { rotate }, { scale }], opacity: opacity };

    return <Animated.View key={key} style={[styles.card, animatedCardStyles, cardStyle, this.props.cardStyle]} {... this._panResponder.panHandlers}>
      {this.renderLeftOverlay()}
      {this.renderRightOverlay()}
      {this.props.renderCard(this.state.card)}
    </Animated.View>;
  }

  renderLeftOverlay() {
    let { pan } = this.state;
    let overlayOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, -(SWIPE_THRESHOLD / 4)], outputRange: [1, 0], extrapolate: 'clamp' });
    let scale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, -SWIPE_THRESHOLD / 4, 0], outputRange: [1.15, .75, 0], extrapolate: 'clamp' });
    let rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["30deg", "0deg", "-30deg"] });
    let animatedOverlay = { transform: [{ scale }, { rotate }], opacity: overlayOpacity };

    if (this.props.renderLeftOverlay) {
      return this.props.renderLeftOverlay(pan);
    }
    // const dynamicLeftWrapper = { top: this.state.viewMode === 'portrait' ? 75 : 100, right: this.state.viewMode === 'portrait' ? 25 : 100 }
    if (this.props.showLeftOverlay) {

      const inner = this.props.overlayLeft
        ? this.props.overlayLeft
        : <Text style={[styles.overlayLeftText, this.props.overlayLeftTextStyle]}>{this.props.overlayLeftText}</Text>

      return <Animated.View style={[styles.overlayLeftWrapper, this.props.overlayLeftWrapper, , animatedOverlay]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  renderUpOverlay() {
    if (!this.props.swipeUp) return null;

    let { pan } = this.state;

    let overlayOpacity = pan.y.interpolate({ inputRange: [(SWIPE_THRESHOLD / 2), SWIPE_THRESHOLD / 4], outputRange: [0, 1], extrapolate: 'clamp' });
    let overlayScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, 0, SWIPE_THRESHOLD / 2], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    let animatedOverlay = { transform: [{ scale: overlayScale }], opacity: overlayOpacity };

    if (this.props.renderUpOverlay) {
      return this.props.renderUpOverlay(pan);
    }


    if (this.props.showUpOverlay) {

      const inner = this.props.overlayUp
        ? this.props.overlayUp
        : <Text style={[styles.overlayUpText, this.props.overlayUpTextStyle]}>{this.props.overlayUpText}</Text>

      return <Animated.View style={[styles.overlayUpWrapper, this.props.overlayUpWrapper, animatedOverlay]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  renderRightOverlay() {
    let { pan } = this.state;
    let overlayOpacity = pan.x.interpolate({ inputRange: [SWIPE_THRESHOLD / 4, SWIPE_THRESHOLD / 3], outputRange: [0, 1], extrapolate: 'clamp' });
    let overlayScale = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD / 4, SWIPE_THRESHOLD / 2], outputRange: [0.5, .75, 1.15], extrapolate: 'clamp' });
    let rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["0deg", "-30deg", "-45deg"] });
    let animatedOverlay = { transform: [{ scale: overlayScale }, { rotate }], opacity: overlayOpacity };

    if (this.props.renderRightOverlay) {
      return this.props.renderRightOverlay(pan);
    }

    if (this.props.showRightOverlay) {

      const inner = this.props.overlayRight
        ? this.props.overlayRight
        : <Text style={[styles.overlayRightText, this.props.overlayRightTextStyle]}>{this.props.overlayRightText}</Text>;

      return <Animated.View style={[styles.overlayRightWrapper, this.props.overlayRightWrapper, animatedOverlay]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  getCardKey = (cardContent, cardIndex) => {
    const { keyExtractor } = this.props
    if (keyExtractor) {
      return keyExtractor(cardContent)
    }
    return cardContent.id;
  }

  render() {
    return (
      <View style={[styles.container, this.props.containerStyle]}>
        {this.props.stack ? this.renderStack() : this.renderCard()}
        {this.renderUpOverlay()}
      </View>
    );
  }
}
