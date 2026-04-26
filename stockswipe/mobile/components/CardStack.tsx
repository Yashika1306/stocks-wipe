import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StockCard } from './StockCard';
import { Colors } from '../constants/theme';
import type { StockCard as StockCardData } from '../hooks/useFeed';
import type { SwipeDirection } from '../hooks/useSwipe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const VERTICAL_THRESHOLD = -80;

interface Props {
  cards: StockCardData[];
  onSwipe: (card: StockCardData, direction: SwipeDirection) => void;
}

function SwipeableCard({
  card,
  onSwipe,
  isTop,
}: {
  card: StockCardData;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const dx = e.translationX;
      const dy = e.translationY;

      if (dy < VERTICAL_THRESHOLD && Math.abs(dx) < 80) {
        translateY.value = withTiming(-SCREEN_WIDTH, { duration: 250 });
        runOnJS(onSwipe)('up');
        return;
      }
      if (dx > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(onSwipe)('right');
        return;
      }
      if (dx < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(onSwipe)('left');
        return;
      }
      // snap back
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])}deg`;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate },
      ],
    };
  });

  const bullishOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  const portfolioOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [VERTICAL_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        <StockCard card={card} />
        <Animated.View style={[styles.stamp, styles.bullishStamp, bullishOpacity]}>
          <Text style={styles.stampText}>BULLISH</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passOpacity]}>
          <Text style={styles.stampText}>PASS</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.portfolioStamp, portfolioOpacity]}>
          <Text style={styles.stampText}>PORTFOLIO</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ cards, onSwipe }: Props) {
  const visibleCards = cards.slice(0, 3);

  if (visibleCards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>You've seen everything for now!</Text>
        <Text style={styles.emptySubtext}>Check back tomorrow for fresh picks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {[...visibleCards].reverse().map((card, i) => {
        const idx = visibleCards.length - 1 - i;
        const isTop = idx === 0;
        const scale = 1 - idx * 0.04;
        const translateY = idx * -12;
        return (
          <Animated.View
            key={card.ticker}
            style={[
              styles.stackItem,
              { transform: [{ scale }, { translateY }], zIndex: visibleCards.length - idx },
            ]}
          >
            <SwipeableCard
              card={card}
              isTop={isTop}
              onSwipe={dir => onSwipe(card, dir)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 520,
  },
  stackItem: {
    position: 'absolute',
  },
  cardWrapper: {
    position: 'relative',
  },
  stamp: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  bullishStamp: {
    right: 20,
    borderColor: Colors.green,
    backgroundColor: Colors.greenDim,
    transform: [{ rotate: '12deg' }],
  },
  passStamp: {
    left: 20,
    borderColor: Colors.red,
    backgroundColor: Colors.redDim,
    transform: [{ rotate: '-12deg' }],
  },
  portfolioStamp: {
    alignSelf: 'center',
    left: 80,
    borderColor: Colors.blue,
    backgroundColor: Colors.blueDim,
  },
  stampText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.text,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
