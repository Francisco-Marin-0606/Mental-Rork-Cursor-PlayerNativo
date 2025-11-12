import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TextStyle, View, Text, ScrollView, Easing, LayoutChangeEvent } from 'react-native';

interface MovingTextProps {
  text: string;
  animationThreshold?: number;
  style?: TextStyle;
}

export function MovingText({ text, animationThreshold = 14, style }: MovingTextProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const shouldAnimate = text.length > animationThreshold;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [textWidth, setTextWidth] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!shouldAnimate || textWidth === 0 || containerWidth === 0) {
      scrollX.setValue(0);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      return;
    }

    const maxScroll = textWidth - containerWidth;
    
    if (maxScroll <= 0) {
      scrollX.setValue(0);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      return;
    }

    const startAnimation = () => {
      scrollX.setValue(0);
      
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scrollX, {
            toValue: maxScroll,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(scrollX, {
            toValue: 0,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      
      animationRef.current.start();
    };

    startAnimation();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [text, shouldAnimate, scrollX, textWidth, containerWidth]);

  useEffect(() => {
    if (shouldAnimate) {
      const listenerId = scrollX.addListener(({ value }) => {
        scrollViewRef.current?.scrollTo({ x: value, animated: false });
      });

      return () => {
        scrollX.removeListener(listenerId);
      };
    }
  }, [scrollX, shouldAnimate]);

  if (!shouldAnimate) {
    return (
      <Text 
        style={style}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {text}
      </Text>
    );
  }

  return (
    <View 
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={{ paddingRight: 0 }}
        style={styles.scrollView}
      >
        <Text
          style={[style, { flexShrink: 0 }]}
          numberOfLines={1}
          onLayout={(e: LayoutChangeEvent) => {
            setTextWidth(e.nativeEvent.layout.width);
          }}
        >
          {text}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
});
