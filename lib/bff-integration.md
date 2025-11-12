# 🚀 Integración con BFF (Backend For Frontend)

Tu aplicación ahora está completamente conectada a tu BFF REST API.

## 📦 Archivos Creados

### 1. **`lib/api-client.ts`** - Cliente API Principal
- ✅ Cliente axios configurado con tu BFF
- ✅ Manejo automático de tokens JWT
- ✅ Interceptores para auth y errores 401
- ✅ Todos los endpoints de tu API implementados
- ✅ Tipos TypeScript completos

**URL Base**: `https://mental-bff-m2iw9.ondigitalocean.app`

### 2. **`lib/api-hooks.ts`** - Hooks de React Query
- ✅ Hooks listos para usar en tus componentes
- ✅ Manejo automático de loading/error states
- ✅ Cache inteligente de datos
- ✅ Invalidación automática de queries

### 3. **`lib/bff-examples.md`** - Guía Completa
- ✅ Ejemplos de uso para cada endpoint
- ✅ Guía de React Query hooks
- ✅ Manejo de errores
- ✅ Patterns recomendados

### 4. **`lib/bff-usage-example.tsx`** - Componente Demo
- ✅ Ejemplo funcional completo
- ✅ Integración con UserSession
- ✅ Uso de hooks de React Query

## 🔑 Endpoints Disponibles

### Autenticación
- `apiClient.auth.login()`
- `apiClient.auth.loginTest()`
- `apiClient.auth.loginCode(code)`

### Usuarios
- `apiClient.user.getById(userId)`
- `apiClient.user.update(userId, data)`
- `apiClient.user.emailExists(email)`
- `apiClient.user.createTrialUser(email)`
- `apiClient.user.enableAura()`

### Audios
- `apiClient.audio.getByUserId(userId)`
- `apiClient.audio.getAllByUserId(userId)`
- `apiClient.audio.updateCustomData(userId, audioRequestId, customData)`

### Audio Requests
- `apiClient.audioRequest.create(data)`
- `apiClient.audioRequest.findByUserId(userId)`
- `apiClient.audioRequest.updateIsAvailable(id)`
- `apiClient.audioRequest.findById(audioRequestId)`

### Chat
- `apiClient.chat.startConversation({ userId, userEmail, message, file? })`
- `apiClient.chat.sendMessage({ chatId, message, file? })`

### Aura Hertz
- `apiClient.auraHertz.getAll()`

### Comentarios
- `apiClient.usersFeedback.getComments(params?)`
- `apiClient.usersFeedback.createComment(data)`
- `apiClient.usersFeedback.updateComment(id, data)`
- `apiClient.usersFeedback.deleteComment(id)`

### Configuración
- `apiClient.appSettings.findAll()`
- `apiClient.requestSettings.findByUserId(userId)`
- `apiClient.requestSettings.getAllLevelRequestSettings()`

### Pagos
- `apiClient.payments.getSubscriptionInfo()`
- `apiClient.payments.getActiveMembership()`
- `apiClient.payments.cancelSubscription(data)`

### Otros
- `apiClient.formQuestions.findByUserId(userId)`
- `apiClient.streamingEvents.findAll()`
- `apiClient.oracle.getByDate(userId, date)`
- `apiClient.appVersion.getLatestVersion()`

## 💡 Uso Rápido

### En un Componente con React Query

```tsx
import { useUser, useAudiosByUserId } from '@/lib/api-hooks';
import { useUserSession } from '@/providers/UserSession';

function MyComponent() {
  const { session } = useUserSession();
  
  // Obtener datos automáticamente
  const { data: user, isLoading } = useUser(session?.userId!);
  const { data: audios } = useAudiosByUserId(session?.userId!);
  
  return (
    <View>
      <Text>{user?.name}</Text>
      <Text>Audios: {audios?.length}</Text>
    </View>
  );
}
```

### Mutaciones (Create/Update/Delete)

```tsx
import { useUpdateUser } from '@/lib/api-hooks';

function EditProfile() {
  const updateUser = useUpdateUser();
  
  const handleUpdate = async () => {
    await updateUser.mutateAsync({
      userId: 'user-id',
      data: { name: 'Nuevo nombre' }
    });
  };
  
  return (
    <Button 
      onPress={handleUpdate}
      disabled={updateUser.isPending}
    >
      {updateUser.isPending ? 'Guardando...' : 'Guardar'}
    </Button>
  );
}
```

### Uso Directo (sin hooks)

```tsx
import { apiClient } from '@/lib/api-client';

async function someFunction() {
  const user = await apiClient.user.getById('user-id');
  const audios = await apiClient.audio.getByUserId('user-id');
}
```

## 🔐 Autenticación

El token JWT se guarda automáticamente en AsyncStorage:

```tsx
// Login
const response = await apiClient.auth.login();
await apiClient.setToken(response.token);

// El token ahora se incluye en TODOS los requests

// Logout
await apiClient.clearToken();
```

## 🎯 Tipos TypeScript

Todos los tipos están disponibles:

```tsx
import type { 
  BFFUser, 
  BFFAudio, 
  BFFAudioRequest,
  BFFComment 
} from '@/lib/api-client';

const user: BFFUser = {
  _id: '123',
  email: 'user@example.com',
  name: 'Usuario',
  isPremium: true,
  auraEnabled: true
};
```

## 📝 Next Steps

1. **Prueba los hooks** - Usa el componente demo en `lib/bff-usage-example.tsx`
2. **Lee los ejemplos** - Revisa `lib/bff-examples.md` para más casos de uso
3. **Integra en tu app** - Reemplaza las llamadas actuales con el nuevo cliente
4. **Maneja errores** - Los hooks de React Query incluyen `error` y `isError`

## 🚨 Importante

- ✅ El token se guarda automáticamente en AsyncStorage
- ✅ Los interceptores manejan 401 (Unauthorized) automáticamente
- ✅ React Query cachea los datos para mejor performance
- ✅ Todos los requests tienen tipos TypeScript
- ✅ Los logs están habilitados para debugging

## 📚 Recursos

- **Cliente API**: `lib/api-client.ts`
- **Hooks**: `lib/api-hooks.ts`
- **Ejemplos**: `lib/bff-examples.md`
- **Demo**: `lib/bff-usage-example.tsx`
