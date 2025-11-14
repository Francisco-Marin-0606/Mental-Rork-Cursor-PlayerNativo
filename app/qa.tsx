import React from 'react';
import { Stack } from 'expo-router';
import QAScreen from '@/components/QAScreen';

export default function QARoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerBackVisible: false,
          headerLeft: () => null,
          presentation: 'card',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <QAScreen />
    </>
  );
}
