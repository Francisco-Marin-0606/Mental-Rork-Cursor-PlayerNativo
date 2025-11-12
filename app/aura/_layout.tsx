import { Stack } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import React, { useState, useMemo } from 'react'
import AuraStickyPlayer from '@/components/AuraStickyPlayer'
import { OfflineBannerProvider, useOfflineBanner } from '@/components/OfflineBanner'
import SettingsModal from '@/components/SettingsModal'

export const SettingsModalContext = React.createContext<{
    isSettingsModalVisible: boolean;
    setSettingsModalVisible: (visible: boolean) => void;
}>({
    isSettingsModalVisible: false,
    setSettingsModalVisible: () => {}
});

const AuraRefactorScreenLayout = () => {
    const [isSettingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);

    const contextValue = useMemo(
        () => ({ isSettingsModalVisible, setSettingsModalVisible }),
        [isSettingsModalVisible]
    );

    return (
        <SettingsModalContext.Provider value={contextValue}>
            <OfflineBannerProvider>
                <View style={styles.root}>
                    <View style={styles.container}>
                        <Stack screenOptions={{
                            gestureEnabled: false,
                            gestureDirection: 'horizontal',
                            contentStyle: { backgroundColor: '#170501' }
                        }}>
                            <Stack.Screen
                                name="index"
                                options={{
                                    headerShown: false,
                                    gestureEnabled: false,
                                }}
                            />
                            <Stack.Screen
                                name="album"
                                options={{
                                    headerShown: false,
                                    gestureEnabled: true,
                                    gestureDirection: 'horizontal',
                                    presentation: 'card',
                                    animation: 'slide_from_right',
                                    contentStyle: { backgroundColor: 'transparent' }
                                }}
                            />
                        </Stack>
                    </View>
                    
                    <AuraStickyPlayer />
                    <SettingsModalRenderer />
                </View>
            </OfflineBannerProvider>
        </SettingsModalContext.Provider>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#170501'
    },
    container: {
        flex: 1,
        backgroundColor: '#170501'
    },

});

const SettingsModalRenderer = () => {
    const { isSettingsModalVisible, setSettingsModalVisible } = React.useContext(SettingsModalContext);
    const { isOnline } = useOfflineBanner();
    
    return (
        <SettingsModal
            visible={isSettingsModalVisible}
            onClose={() => setSettingsModalVisible(false)}
            isOnline={isOnline}
        />
    );
};

export default AuraRefactorScreenLayout
