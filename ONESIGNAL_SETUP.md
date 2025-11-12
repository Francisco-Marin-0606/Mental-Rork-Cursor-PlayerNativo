# Configuración OneSignal - Mental App

## ⚠️ Importante

**OneSignal NO funcionará en Expo Go** porque requiere módulos nativos que solo están disponibles con expo dev client. Solo funcionará cuando hagas build con EAS Build para TestFlight o Play Store.

---

## 📋 Configuración Manual Requerida

### 1. Instalar Dependencias

Agrega manualmente a `package.json` en la sección `dependencies`:

```json
"react-native-onesignal": "~5.2.8",
"onesignal-expo-plugin": "~2.0.3"
```

Luego ejecuta:
```bash
bun install
```

---

### 2. Configurar app.json

#### A) Agregar Plugin de OneSignal

En el array `plugins`, agrega:

```json
[
  "onesignal-expo-plugin",
  {
    "mode": "development"
  }
]
```

El array completo debería verse así:

```json
"plugins": [
  [
    "expo-router",
    {
      "origin": "https://rork.com/"
    }
  ],
  [
    "expo-av",
    {
      "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
    }
  ],
  [
    "expo-screen-orientation",
    {
      "initialOrientation": "DEFAULT"
    }
  ],
  [
    "sentry-expo",
    {
      "organization": "mental-magnet",
      "project": "rork-mental-app"
    }
  ],
  [
    "onesignal-expo-plugin",
    {
      "mode": "development"
    }
  ]
]
```

#### B) Agregar Configuración Extra

Después de la sección `"experiments"`, agrega la sección `"extra"`:

```json
"experiments": {
  "typedRoutes": true
},
"extra": {
  "oneSignalAppId": "35bff50e-438f-422d-89c7-25f966dbe812",
  "eas": {
    "build": {
      "experimental": {
        "ios": {
          "appExtensions": [
            {
              "targetName": "OneSignalNotificationServiceExtension",
              "bundleIdentifier": "com.mentalmagnet.mentalMagnetAppios.OneSignalNotificationServiceExtension",
              "entitlements": {
                "com.apple.security.application-groups": [
                  "group.com.mentalmagnet.mentalMagnetAppios.onesignal"
                ]
              }
            }
          ]
        }
      }
    }
  }
}
```

---

## ✅ Código ya Integrado

El código de OneSignal ya está integrado en `app/_layout.tsx` e incluye:

### 1. Inicialización Automática
- Se inicializa automáticamente cuando la app está lista
- Solicita permisos de notificaciones
- Nivel de logs en modo Verbose para debugging

### 2. Login/Logout Automático
- Cuando el usuario inicia sesión, automáticamente se registra en OneSignal
- Cuando cierra sesión, se desregistra
- Usa el `userId` de `UserSession`

### 3. Manejo de Clicks en Notificaciones
- Navega automáticamente según el campo `route` en `additionalData`
- Soporta deep links

### 4. Logs Detallados
- Todos los eventos tienen logs para facilitar debugging
- Verás en consola cuando OneSignal se inicialice, registre usuarios, etc.

---

## 📱 Formato de Notificaciones

### Notificación Simple con Navegación

```json
{
  "app_id": "35bff50e-438f-422d-89c7-25f966dbe812",
  "contents": {
    "en": "Tu hipnosis está lista"
  },
  "headings": {
    "en": "Mental"
  },
  "data": {
    "route": "/aura"
  },
  "include_external_user_ids": ["USER_ID_AQUI"]
}
```

### Notificación con Deep Link

```json
{
  "app_id": "35bff50e-438f-422d-89c7-25f966dbe812",
  "contents": {
    "en": "Nuevo álbum disponible"
  },
  "headings": {
    "en": "Mental"
  },
  "url": "myapp://notification/album/123",
  "include_external_user_ids": ["USER_ID_AQUI"]
}
```

---

## 🔧 Configuración iOS (Apple Developer)

### 1. Capabilities Requeridas
En tu Apple Developer Portal, asegúrate de tener:
- **Push Notifications** habilitado
- **App Groups** configurado con: `group.com.mentalmagnet.mentalMagnetAppios.onesignal`

### 2. Certificados de Push
- Necesitas configurar certificados de push en OneSignal dashboard
- Sigue la guía: https://documentation.onesignal.com/docs/generate-an-ios-push-certificate

---

## 🤖 Configuración Android

El plugin de OneSignal configura automáticamente Android, incluyendo:
- Permisos necesarios
- Google Services
- Firebase Cloud Messaging (si aplica)

---

## 🧪 Testing

### En Desarrollo (Expo Go)
❌ **NO funcionará** - Verás el mensaje: `[OneSignal] Module not available (Expo Go limitation)`

### En TestFlight / Play Store
✅ **Funcionará** después de hacer build con EAS:

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

### Verificar en Logs
Busca estos mensajes en la consola:
```
[OneSignal] Initializing...
[OneSignal] Initialized successfully
[OneSignal] User logged in: [USER_ID]
[OneSignal] Click listener registered
```

---

## 📊 Dashboard de OneSignal

**App ID:** `35bff50e-438f-422d-89c7-25f966dbe812`

Accede al dashboard en:
https://app.onesignal.com/apps/35bff50e-438f-422d-89c7-25f966dbe812

---

## 🎯 Casos de Uso Implementados

### 1. Usuario Inicia Sesión
```typescript
// En tu código de login
setSession({ userId: "user123", email: "user@example.com" })
// → OneSignal automáticamente registra al usuario
```

### 2. Usuario Cierra Sesión
```typescript
// En tu código de logout
clearSession()
// → OneSignal automáticamente desregistra al usuario
```

### 3. Usuario Hace Click en Notificación
```json
// Payload de la notificación
{
  "data": {
    "route": "/aura/album"
  }
}
// → App navega automáticamente a /aura/album
```

---

## 🐛 Troubleshooting

### Error: "Module not available"
- **Causa:** Estás en Expo Go
- **Solución:** Esto es normal. Solo funcionará en builds nativos

### Error: "App ID not found"
- **Causa:** `app.json` no tiene la configuración `extra.oneSignalAppId`
- **Solución:** Agrega la configuración según las instrucciones arriba

### Notificaciones no llegan
1. Verifica que el usuario esté registrado: busca `[OneSignal] User logged in` en logs
2. Verifica permisos de notificaciones en el dispositivo
3. Verifica en OneSignal dashboard que el usuario esté suscrito
4. Para iOS, verifica que los certificados de push estén configurados

### Click en notificación no navega
1. Verifica que el payload incluya `additionalData.route`
2. Busca `[OneSignal] Notification clicked` en logs
3. Verifica que la ruta sea válida en tu app

---

## 📚 Referencias

- [Documentación OneSignal React Native](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal Expo Plugin](https://github.com/OneSignal/onesignal-expo-plugin)
- [OneSignal Dashboard](https://app.onesignal.com/)

---

## ✨ Próximos Pasos

1. **Actualizar `package.json`** con las dependencias
2. **Actualizar `app.json`** con la configuración
3. **Hacer build con EAS** para testear
4. **Configurar certificados iOS** en OneSignal dashboard
5. **Enviar notificación de prueba** desde OneSignal dashboard

---

**Última actualización:** Enero 2025
**OneSignal SDK:** ~5.2.8
**Plugin:** ~2.0.3
