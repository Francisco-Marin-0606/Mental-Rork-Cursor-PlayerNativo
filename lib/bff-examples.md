# BFF API Client - Guía de Uso

Este archivo muestra ejemplos de cómo usar el cliente API del BFF en tu aplicación.

## 🔐 Autenticación

El token JWT se guarda automáticamente en AsyncStorage y se incluye en cada request.

```tsx
import { apiClient } from '@/lib/api-client';

// Login (retorna token)
const loginResponse = await apiClient.auth.login();
await apiClient.setToken(loginResponse.token);

// Login con código
const codeResponse = await apiClient.auth.loginCode('123456');
await apiClient.setToken(codeResponse.token);

// Cerrar sesión
await apiClient.clearToken();
```

## 📝 Usando React Query Hooks

```tsx
import { useUser, useUpdateUser, useAudiosByUserId } from '@/lib/api-hooks';
import { useUserSession } from '@/providers/UserSession';

function UserProfile() {
  const { session } = useUserSession();
  const userId = session?.userId;

  // Obtener usuario
  const { data: user, isLoading, error } = useUser(userId!);

  // Actualizar usuario
  const updateUser = useUpdateUser();

  const handleUpdate = async () => {
    await updateUser.mutateAsync({
      userId: userId!,
      data: { name: 'Nuevo Nombre' }
    });
  };

  if (isLoading) return <Text>Cargando...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View>
      <Text>{user?.name}</Text>
      <Text>{user?.email}</Text>
      <Button onPress={handleUpdate}>Actualizar</Button>
    </View>
  );
}
```

## 🎵 Audios

```tsx
import { useAudiosByUserId, useUpdateAudioCustomData } from '@/lib/api-hooks';

function AudioList() {
  const { session } = useUserSession();
  const { data: audios } = useAudiosByUserId(session?.userId!);
  const updateCustomData = useUpdateAudioCustomData();

  const handleRename = async (audioRequestId: string, newName: string) => {
    await updateCustomData.mutateAsync({
      userId: session?.userId!,
      audioRequestId,
      customData: { customName: newName }
    });
  };

  return (
    <View>
      {audios?.map((audio) => (
        <View key={audio._id}>
          <Text>{audio.title}</Text>
          <Button onPress={() => handleRename(audio.audioRequestId, 'Nuevo nombre')}>
            Renombrar
          </Button>
        </View>
      ))}
    </View>
  );
}
```

## 💬 Chat

```tsx
import { apiClient } from '@/lib/api-client';

async function startChat() {
  const { chatId } = await apiClient.chat.startConversation({
    userId: 'user-id',
    userEmail: 'user@example.com',
    message: 'Hola!'
  });

  // Enviar mensaje
  await apiClient.chat.sendMessage({
    chatId,
    message: '¿Cómo estás?'
  });
}
```

## 🎯 Audio Requests

```tsx
import { useAudioRequestsByUserId, useCreateAudioRequest } from '@/lib/api-hooks';

function AudioRequests() {
  const { session } = useUserSession();
  const { data: requests } = useAudioRequestsByUserId(session?.userId!);
  const createRequest = useCreateAudioRequest();

  const handleCreate = async () => {
    await createRequest.mutateAsync({
      duration: 10,
      topic: 'Relajación'
    });
  };

  return (
    <View>
      <Button onPress={handleCreate}>Crear Request</Button>
      {requests?.map((req) => (
        <Text key={req._id}>
          {req.isAvailable ? 'Disponible' : 'Procesando'}
        </Text>
      ))}
    </View>
  );
}
```

## 🌟 Aura Hertz

```tsx
import { useAuraHertz } from '@/lib/api-hooks';

function AuraHertzList() {
  const { data: hertzList, isLoading } = useAuraHertz();

  if (isLoading) return <Text>Cargando...</Text>;

  return (
    <View>
      {hertzList?.map((hz) => (
        <View key={hz._id}>
          <Text>{hz.name}</Text>
          <Text>{hz.frequency} Hz</Text>
          <Text>{hz.description}</Text>
        </View>
      ))}
    </View>
  );
}
```

## 💳 Pagos

```tsx
import { usePaymentInfo, useActiveMembership } from '@/lib/api-hooks';

function PaymentInfo() {
  const { data: paymentInfo } = usePaymentInfo();
  const { data: membership } = useActiveMembership();

  return (
    <View>
      <Text>Membresía activa: {membership?.status}</Text>
      <Text>Próximo pago: {paymentInfo?.nextBillingDate}</Text>
    </View>
  );
}
```

## 📝 Comentarios

```tsx
import { useComments, useCreateComment, useDeleteComment } from '@/lib/api-hooks';

function Comments() {
  const { data: comments } = useComments({
    portal: 6001,
    language: 'es',
    state: 'APPROVED'
  });

  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const handleCreate = async () => {
    await createComment.mutateAsync({
      content: 'Gran aplicación!',
      author: 'Usuario',
      portal: 6001,
      userId: 'user-id',
      publishedAt: new Date().toISOString(),
      likeCount: 0,
      state: 'PENDING',
      language: 'es'
    });
  };

  return (
    <View>
      <Button onPress={handleCreate}>Crear Comentario</Button>
      {comments?.map((comment) => (
        <View key={comment._id}>
          <Text>{comment.author}: {comment.content}</Text>
          <Button onPress={() => deleteComment.mutate(comment._id)}>
            Eliminar
          </Button>
        </View>
      ))}
    </View>
  );
}
```

## 🔮 Oráculo del Día

```tsx
import { useOracle } from '@/lib/api-hooks';

function DailyOracle() {
  const { session } = useUserSession();
  const today = new Date().toISOString().split('T')[0];
  const { data: oracle, isLoading } = useOracle(session?.userId!, today);

  if (isLoading) return <Text>Cargando oráculo...</Text>;

  return (
    <View>
      <Text>Oráculo del día:</Text>
      <Text>{oracle?.content}</Text>
    </View>
  );
}
```

## ⚙️ Configuración

```tsx
import { useAppSettings, useRequestSettings } from '@/lib/api-hooks';

function Settings() {
  const { session } = useUserSession();
  const { data: appSettings } = useAppSettings();
  const { data: userSettings } = useRequestSettings(session?.userId!);

  return (
    <View>
      <Text>Configuración de la App:</Text>
      {appSettings?.map((setting) => (
        <Text key={setting._id}>
          {setting.key}: {JSON.stringify(setting.value)}
        </Text>
      ))}
    </View>
  );
}
```

## 🎥 Eventos de Streaming

```tsx
import { useStreamingEvents } from '@/lib/api-hooks';

function StreamingEvents() {
  const { data: events, isLoading } = useStreamingEvents();

  if (isLoading) return <Text>Cargando eventos...</Text>;

  return (
    <View>
      {events?.map((event) => (
        <View key={event._id}>
          <Text>{event.title}</Text>
          <Text>{event.description}</Text>
          <Text>Tag: {event.tag}</Text>
          <Text>Fecha: {event.scheduledAt}</Text>
        </View>
      ))}
    </View>
  );
}
```

## 📱 Versión de la App

```tsx
import { useAppVersion } from '@/lib/api-hooks';

function AppVersionCheck() {
  const { data: version } = useAppVersion();

  return (
    <View>
      <Text>Última versión disponible: {version?.version}</Text>
    </View>
  );
}
```

## 🔧 Uso Directo (sin React Query)

Si necesitas hacer requests fuera de componentes:

```tsx
import { apiClient } from '@/lib/api-client';

async function someBackgroundTask() {
  try {
    const user = await apiClient.user.getById('user-id');
    console.log('User:', user);

    const audios = await apiClient.audio.getByUserId('user-id');
    console.log('Audios:', audios);

    await apiClient.user.update('user-id', { name: 'Nuevo nombre' });
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 🚨 Manejo de Errores

```tsx
import { useUser } from '@/lib/api-hooks';

function UserProfile() {
  const { data, error, isLoading, isError } = useUser('user-id');

  if (isLoading) return <Text>Cargando...</Text>;
  
  if (isError) {
    return (
      <View>
        <Text>Error al cargar usuario</Text>
        <Text>{error?.message}</Text>
      </View>
    );
  }

  return <Text>{data?.name}</Text>;
}
```

## 🔄 Mutaciones con Loading State

```tsx
import { useUpdateUser } from '@/lib/api-hooks';

function EditProfile() {
  const updateUser = useUpdateUser();
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    try {
      await updateUser.mutateAsync({
        userId: 'user-id',
        data: { name }
      });
      alert('Perfil actualizado');
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  return (
    <View>
      <TextInput value={name} onChangeText={setName} />
      <Button 
        onPress={handleSubmit}
        disabled={updateUser.isPending}
      >
        {updateUser.isPending ? 'Guardando...' : 'Guardar'}
      </Button>
    </View>
  );
}
```

## 📚 Tipos Disponibles

Todos los tipos están exportados desde `@/lib/api-client`:

- `BFFUser`
- `BFFAudio`
- `BFFAudioRequest`
- `BFFFormQuestion`
- `BFFStreamingEvent`
- `BFFAppSettings`
- `BFFRequestSettings`
- `BFFChat`
- `BFFOracle`
- `BFFAuraHertz`
- `BFFComment`
