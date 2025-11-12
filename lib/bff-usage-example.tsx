import { View, Text, Button, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useUserSession } from '@/providers/UserSession';
import { 
  useUser, 
  useUpdateUser, 
  useAudiosByUserId,
  useAuraHertz,
  useAppVersion,
  useEnableAura 
} from '@/lib/api-hooks';
import { apiClient } from '@/lib/api-client';

export function BFFUsageExample() {
  const { session } = useUserSession();
  const userId = session?.userId;

  const { data: user, isLoading: userLoading } = useUser(userId!);
  const { data: audios, isLoading: audiosLoading } = useAudiosByUserId(userId!);
  const { data: hertzList } = useAuraHertz();
  const { data: appVersion } = useAppVersion();

  const updateUser = useUpdateUser();
  const enableAura = useEnableAura();

  const [newName, setNewName] = useState<string>('');

  const handleUpdateName = async () => {
    if (!userId || !newName) return;
    
    try {
      await updateUser.mutateAsync({
        userId,
        data: { name: newName }
      });
      alert('Nombre actualizado');
    } catch {
      alert('Error al actualizar nombre');
    }
  };

  const handleEnableAura = async () => {
    try {
      await enableAura.mutateAsync();
      alert('Aura habilitado');
    } catch {
      alert('Error al habilitar Aura');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await apiClient.auth.loginTest();
      if (response.token) {
        await apiClient.setToken(response.token);
        alert('Login exitoso');
      }
    } catch {
      alert('Error en login');
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No hay sesión activa</Text>
        <Button title="Login de prueba" onPress={handleLogin} />
      </View>
    );
  }

  if (userLoading) {
    return (
      <View style={styles.container}>
        <Text>Cargando usuario...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Usuario</Text>
        <Text>ID: {user?._id}</Text>
        <Text>Email: {user?.email}</Text>
        <Text>Nombre: {user?.name || 'Sin nombre'}</Text>
        <Text>Premium: {user?.isPremium ? 'Sí' : 'No'}</Text>
        <Text>Aura: {user?.auraEnabled ? 'Habilitado' : 'Deshabilitado'}</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Nuevo nombre"
            value={newName}
            onChangeText={setNewName}
          />
          <Button 
            title={updateUser.isPending ? 'Guardando...' : 'Actualizar nombre'}
            onPress={handleUpdateName}
            disabled={updateUser.isPending}
          />
        </View>

        {!user?.auraEnabled && (
          <Button 
            title={enableAura.isPending ? 'Habilitando...' : 'Habilitar Aura'}
            onPress={handleEnableAura}
            disabled={enableAura.isPending}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎵 Audios</Text>
        {audiosLoading ? (
          <Text>Cargando audios...</Text>
        ) : (
          <>
            <Text>Total: {audios?.length || 0}</Text>
            {audios?.slice(0, 3).map((audio) => (
              <View key={audio._id} style={styles.audioItem}>
                <Text>• {audio.title || 'Sin título'}</Text>
                <Text style={styles.small}>  ID: {audio._id}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌟 Aura Hertz</Text>
        {hertzList?.slice(0, 3).map((hz) => (
          <View key={hz._id} style={styles.hertzItem}>
            <Text>• {hz.name}</Text>
            <Text style={styles.small}>  {hz.frequency} Hz</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 App Info</Text>
        <Text>Versión disponible: {appVersion?.version || 'Cargando...'}</Text>
      </View>

      <View style={styles.section}>
        <Button 
          title="Cerrar sesión" 
          onPress={async () => {
            await apiClient.clearToken();
            alert('Sesión cerrada');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  inputGroup: {
    marginTop: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fff',
  },
  audioItem: {
    marginVertical: 4,
  },
  hertzItem: {
    marginVertical: 4,
  },
  small: {
    fontSize: 12,
    color: '#666',
  },
});
