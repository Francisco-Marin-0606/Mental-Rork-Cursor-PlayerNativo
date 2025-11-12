# Configuración React Native Track Player - Mental App

## ⚠️ Importante

**React Native Track Player NO funcionará en Expo Go** porque requiere módulos nativos. Solo funcionará cuando hagas build con EAS Build para TestFlight o Play Store.

---

## 📋 Configuración Manual Requerida

### 1. Instalar Dependencias

Agrega manualmente a `package.json` en la sección `dependencies`:

```json
"react-native-track-player": "^4.1.1"
```

Luego ejecuta:
```bash
bun install
```

---

### 2. Configurar app.json

#### iOS - Background Modes

Ya tienes configurado `UIBackgroundModes: ["audio"]` que es necesario para audio en background.

#### Android - Permisos

Agrega a la sección `android.permissions`:

```json
"permissions": [
  "RECORD_AUDIO",
  "android.permission.VIBRATE",
  "android.permission.REQUEST_INSTALL_PACKAGES",
  "ACCESS_NETWORK_STATE",
  "ACCESS_WIFI_STATE",
  "FOREGROUND_SERVICE",
  "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "WAKE_LOCK"
]
```

---

## ✅ Código ya Integrado

El código de Track Player ya está integrado en `providers/PlayerProvider.tsx` e incluye:

### 1. Inicialización Automática
- Se inicializa automáticamente cuando la app está lista
- Configura capacidades de audio: play, pause, skipToNext, skipToPrevious, seekTo
- Configuración de notificación para iOS y Android

### 2. Now Playing Info Automático
- Muestra título del track en lock screen
- Muestra artista en lock screen
- Muestra artwork/cover en lock screen
- Muestra álbum en lock screen
- Muestra barra de progreso con timeline
- Controles funcionales (play/pause, skip, seek)

### 3. Manejo de Eventos Remotos
- Controles desde lock screen funcionan
- Controles desde auriculares/Bluetooth funcionan
- Soporta: play, pause, next, previous, seek

### 4. Playlist Management
- Soporta playlists completas
- Navegación entre tracks
- Shuffle

---

## 📱 Características del Lock Screen

### iOS Lock Screen
- ✅ Título del track
- ✅ Artista/Subtítulo
- ✅ Nombre del álbum
- ✅ Artwork/Cover
- ✅ Barra de progreso con timeline actualizado en tiempo real
- ✅ Controles de play/pause
- ✅ Controles de skip forward/backward
- ✅ Control de seek (deslizar en timeline)

### Android Lock Screen / Notification
- ✅ Todo lo mismo que iOS
- ✅ Notificación persistente cuando hay audio en reproducción
- ✅ Controles en la notificación
- ✅ Widget de lock screen

---

## 🎵 Uso en el Código

### Reproducir un Track

```typescript
import { usePlayer } from '@/providers/PlayerProvider';

const { playTrack } = usePlayer();

await playTrack({
  id: 'track-1',
  title: 'Nombre del Track',
  subtitle: 'Artista o descripción',
  trackUrl: 'https://url-del-audio.mp3',
  imageUrl: 'https://url-del-cover.jpg',
  isHypnosis: false,
});
```

### Controlar la Reproducción

```typescript
const { play, pause, next, prev, isPlaying } = usePlayer();

await play();    // Reproducir
await pause();   // Pausar
await next();    // Siguiente track
await prev();    // Track anterior
```

### Con Playlist

```typescript
const tracks = [
  { id: '1', title: 'Track 1', trackUrl: '...', imageUrl: '...' },
  { id: '2', title: 'Track 2', trackUrl: '...', imageUrl: '...' },
  { id: '3', title: 'Track 3', trackUrl: '...', imageUrl: '...' },
];

// Reproducir el track 2 con la playlist
await playTrack(tracks[1], tracks);
```

---

## 🔧 Configuración de Track

Cada track que reproduzcas debe tener esta estructura:

```typescript
interface Track {
  id: string;              // ID único del track
  title: string;           // Título (se muestra en lock screen)
  subtitle?: string;       // Artista/descripción (se muestra en lock screen)
  trackUrl?: string;       // URL del audio (mp3, m4a, etc.)
  imageUrl?: string;       // URL del cover/artwork (se muestra en lock screen)
  vinillo?: string;        // Campo adicional (no usado en lock screen)
  color?: string;          // Campo adicional (no usado en lock screen)
  isHypnosis?: boolean;    // Si es true, el artista será "Mental" y álbum "Hipnosis"
}
```

---

## 🧪 Testing

### En Desarrollo (Expo Go)
❌ **NO funcionará** - Track Player requiere módulos nativos

### En TestFlight / Play Store
✅ **Funcionará** después de hacer build con EAS:

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

### Verificar en Logs
Busca estos mensajes en la consola:
```
[TrackPlayer] Initializing...
[TrackPlayer] Service created
[TrackPlayer] Playing track: [TRACK_TITLE]
[TrackPlayer] Set now playing info: [TRACK_TITLE]
```

---

## 🎯 Diferencias con expo-audio

| Característica | expo-audio | react-native-track-player |
|---------------|-----------|---------------------------|
| **Lock Screen Metadata** | ❌ No funciona bien | ✅ Funciona perfectamente |
| **Progress Bar en Lock Screen** | ❌ No actualiza | ✅ Actualiza en tiempo real |
| **Remote Controls** | ⚠️ Limitado | ✅ Completo |
| **Expo Go Support** | ✅ Sí | ❌ No (requiere custom build) |
| **Production Ready** | ⚠️ Para casos simples | ✅ Para apps de música |

---

## 🐛 Troubleshooting

### Error: "Module not available"
- **Causa:** Estás en Expo Go
- **Solución:** Esto es normal. Solo funcionará en builds nativos con EAS

### Lock screen no muestra metadatos
1. Verifica que el track tenga `title`, `subtitle`, `imageUrl`
2. Busca `[TrackPlayer] Set now playing info` en logs
3. Verifica que hayas inicializado Track Player antes de reproducir

### Controls no funcionan en lock screen
1. Verifica que Track Player esté inicializado
2. Verifica que los event handlers estén registrados
3. Busca errores en logs relacionados con remote controls

### Audio se detiene en background
1. **iOS:** Verifica `UIBackgroundModes: ["audio"]` en `app.json`
2. **Android:** Verifica permisos de FOREGROUND_SERVICE
3. Verifica que el audio mode esté configurado correctamente

---

## 🚀 Build para Producción

### iOS

1. Actualiza `app.json` con la configuración de background modes (ya está)
2. Build con EAS:
```bash
eas build --platform ios --profile production
```

### Android

1. Actualiza permisos en `app.json` (ver arriba)
2. Build con EAS:
```bash
eas build --platform android --profile production
```

---

## 📚 Referencias

- [React Native Track Player Docs](https://react-native-track-player.js.org/)
- [Expo Custom Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [iOS Background Audio](https://developer.apple.com/documentation/avfoundation/media_playback/configuring_your_app_for_media_playback)

---

## ✨ Próximos Pasos

1. ✅ **Código ya integrado** en `providers/PlayerProvider.tsx`
2. **Actualizar `package.json`** con la dependencia
3. **Actualizar `app.json`** con permisos de Android
4. **Hacer build con EAS** para testear en TestFlight/Play Store
5. **Probar lock screen controls** en dispositivo real

---

**Última actualización:** Enero 2025
**Track Player Version:** ^4.1.1
