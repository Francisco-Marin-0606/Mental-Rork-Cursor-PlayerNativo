import { Stack } from "expo-router";

export default function AlbumLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'none',
      presentation: 'transparentModal',
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
      contentStyle: { backgroundColor: 'transparent' }
    }}>
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' }
        }}
      />
    </Stack>
  );
}
