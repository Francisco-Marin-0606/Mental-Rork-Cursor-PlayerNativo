import { useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAppVersion } from '@/lib/api-hooks';
import Constants from 'expo-constants';

interface AppVersionState {
  minRequiredVersion: string | null;
  currentVersion: string;
  updateRequired: boolean;
  isChecking: boolean;
}

export const [AppVersionProvider, useAppVersionCheck] = createContextHook<AppVersionState>(() => {
  const [minRequiredVersion, setMinRequiredVersion] = useState<string | null>(null);
  const [updateRequired, setUpdateRequired] = useState<boolean>(false);
  
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  
  const { data: versionData, isLoading } = useAppVersion();

  useEffect(() => {
    if (versionData) {
      console.log('[AppVersionProvider] Version check response:', versionData);
      console.log('[AppVersionProvider] Current app version:', currentVersion);
      console.log('[AppVersionProvider] Min required version:', versionData.minRequiredVersion);
      
      setMinRequiredVersion(versionData.minRequiredVersion);
      
      const needsUpdate = compareVersions(currentVersion, versionData.minRequiredVersion) < 0;
      console.log('[AppVersionProvider] Update required:', needsUpdate);
      
      setUpdateRequired(needsUpdate);
    }
  }, [versionData, currentVersion]);

  return useMemo(() => ({
    minRequiredVersion,
    currentVersion,
    updateRequired,
    isChecking: isLoading,
  }), [minRequiredVersion, currentVersion, updateRequired, isLoading]);
});

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(n => parseInt(n, 10));
  const parts2 = v2.split('.').map(n => parseInt(n, 10));
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
}
