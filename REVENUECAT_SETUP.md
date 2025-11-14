# Integración de RevenueCat - Paso a Paso

## ✅ ¿Por qué RevenueCat?
RevenueCat simplifica las suscripciones in-app en iOS y Android, manejando:
- Compras y renovaciones
- Validación de recibos
- Estado de suscripción en tiempo real
- Webhooks y analytics
- Pruebas gratuitas y ofertas

## 📋 Pasos Previos (Tu Responsabilidad)

### 1. Crear Cuenta en RevenueCat
1. Ve a [app.revenuecat.com](https://app.revenuecat.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto

### 2. Configurar iOS en App Store Connect
1. Ve a [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Crea tu aplicación si no existe
3. Ve a **Features > In-App Purchases**
4. Crea tus productos de suscripción:
   - **Product ID** (ej: `monthly_subscription`, `yearly_subscription`)
   - Precio y duración
   - Descripción y nombre localizado

### 3. Configurar Android en Google Play Console
1. Ve a [play.google.com/console](https://play.google.com/console)
2. Crea tu aplicación si no existe
3. Ve a **Monetize > Subscriptions**
4. Crea tus productos de suscripción:
   - **Product ID** (debe coincidir con iOS si quieres multi-plataforma)
   - Precio y período de facturación
   - Prueba gratuita (opcional)

### 4. Conectar RevenueCat con las Tiendas

#### Para iOS:
1. En RevenueCat Dashboard → **Project Settings**
2. Ve a **Apple App Store**
3. Necesitas:
   - **App Bundle ID**
   - **App-Specific Shared Secret** (desde App Store Connect → App Information → App-Specific Shared Secret)
   - O **In-App Purchase Key** (recomendado, desde App Store Connect → Users and Access → Keys)

#### Para Android:
1. En RevenueCat Dashboard → **Project Settings**
2. Ve a **Google Play Store**
3. Necesitas crear una **Service Account** en Google Cloud:
   - Ve a Google Cloud Console
   - Crea una Service Account
   - Dale permisos de "View financial data" en Play Console
   - Genera una clave JSON
   - Sube esta clave JSON a RevenueCat

### 5. Crear Offerings en RevenueCat
1. En RevenueCat Dashboard → **Offerings**
2. Crea un Offering (ej: "default")
3. Agrega Packages:
   - **$rc_monthly**: vincula tu product ID mensual
   - **$rc_annual**: vincula tu product ID anual
   - Puedes crear packages personalizados

## 🔑 Información que Debes Entregarme

Para que yo pueda implementar RevenueCat en tu app, necesito:

### 1. API Key de RevenueCat
```
Ubicación: RevenueCat Dashboard → Project Settings → API Keys
Necesito: "Public API Key" (empieza con "appl_..." para iOS o "goog_..." para Android)
        O mejor aún, el "SDK API Key" que funciona para ambas plataformas

Formato: EXPO_PUBLIC_REVENUECAT_API_KEY=sk_xxxxxxxxxxxxx
```

### 2. Entitlements Configurados
```
Los nombres de los "Entitlements" que creaste en RevenueCat
Ejemplo: "pro", "premium", "unlimited"

Estos determinan qué funcionalidades desbloqueas
```

### 3. Product IDs (Opcional, pero útil)
```
Los Product IDs que creaste en App Store Connect y Google Play
Ejemplo:
- monthly_subscription
- yearly_subscription
- lifetime_purchase
```

### 4. Offering ID (Opcional)
```
El nombre del Offering que quieres usar
Por defecto: "default"
```

## 🚀 Lo que Yo Implementaré

Una vez me entregues la información anterior, yo:

1. ✅ Instalaré `react-native-purchases` (compatible con Expo)
2. ✅ Crearé un Provider para manejar el estado de suscripción
3. ✅ Implementaré:
   - Pantalla de paywall/precios
   - Verificación de estado de suscripción
   - Manejo de compras
   - Restauración de compras
   - Manejo de errores
4. ✅ Integraré con tu sistema de usuarios existente
5. ✅ Agregaré logs para debugging

## 📱 Flujo Final de Usuario

```
1. Usuario abre pantalla de suscripción
2. Ve los planes disponibles (desde RevenueCat Offerings)
3. Selecciona un plan
4. Sistema nativo procesa el pago (App Store/Google Play)
5. RevenueCat valida la compra
6. App desbloquea funcionalidades premium
7. Usuario puede restaurar compras en otros dispositivos
```

## ⚠️ Notas Importantes

- **Sandbox Testing**: Usa cuentas de prueba de App Store y Google Play para testing
- **Review Process**: Apple y Google revisan las apps con IAP, asegúrate de tener contenido premium listo
- **Políticas**: Cumple con las políticas de las tiendas sobre suscripciones
- **Webhooks**: RevenueCat puede enviar webhooks a tu backend (opcional, pero recomendado)

## 📝 Checklist

Antes de empezar, asegúrate de tener:

- [ ] Cuenta de RevenueCat creada
- [ ] Productos de suscripción creados en App Store Connect
- [ ] Productos de suscripción creados en Google Play Console
- [ ] RevenueCat conectado con ambas tiendas
- [ ] Offerings configurados en RevenueCat
- [ ] API Key de RevenueCat obtenida
- [ ] Entitlements configurados

## 🎯 TU CONFIGURACIÓN - Mental: Hipnosis Personalizada

### ✅ Datos Recibidos:

**Apps Configuradas:**
- iOS: `appl_JIgqffPngTJdriVoNIdXjDxZisc`
- Android: `goog_NxdUftDeAYMdsAdqhvDiiNOZnKi`

**Entitlement:** `Mental`

### ✅ Integración Completada!

**API Keys configuradas:**
- iOS: `appl_JIgqffPngTJdriVoNIdXjDxZisc`
- Android: `goog_NxdUftDeAYMdsAdqhvDiiNOZnKi`

**Entitlement a usar:** `Mental`

**Apps:**
- iOS: Mental: Hipnosis Personalizada (App Store)
- Android: Mental: Hipnosis Personalizada (Play Store)

### 📦 Archivos Creados:

1. **`providers/RevenueCatProvider.tsx`**
   - Provider principal de RevenueCat
   - Maneja estado de suscripción
   - Login automático de usuarios
   - Listener de cambios en tiempo real

2. **`components/SubscriptionPaywall.tsx`**
   - Componente de ejemplo de paywall
   - Muestra planes disponibles
   - Maneja compras y restauración
   - Diseño adaptado al estilo de la app

### 🎨 Configurar Paywall en RevenueCat Dashboard

Para usar el paywall personalizado que diseñaste en RevenueCat:

**1. Crear un Paywall en RevenueCat:**
   1. Ve a RevenueCat Dashboard → **Paywalls**
   2. Crea un nuevo paywall con el nombre: `PayWall-InApp | BG completo`
   3. Configura el diseño visual (colores, imágenes, textos)
   4. **IMPORTANTE**: Añade los siguientes campos en el **metadata** del offering:
      ```json
      {
        "background_color": "#170501",
        "text_color": "#FFFFFF",
        "call_to_action_background_color": "#FFFFFF",
        "call_to_action_text_color": "#170501",
        "header_text": "Desbloquea Mental Premium",
        "body_text": "Acceso ilimitado a todas las hipnosis personalizadas",
        "call_to_action_text": "Suscribirse",
        "background_image_url": "https://ejemplo.com/imagen.jpg" (opcional),
        "features": ["Feature 1", "Feature 2", "Feature 3"] (opcional)
      }
      ```

**2. IDs Configurados en tu App:**
   - **Offering ID**: `renewal_off`
   - **Offering API ID**: `ofrng328a4a1622`
   - **Project ID**: `proj8c5295cc`
   - **Paywall Name**: `PayWall-InApp | BG completo`

**3. Cómo la App Carga el Paywall:**
   - La app hace fetch a la API de RevenueCat para obtener la configuración del paywall
   - Usa los valores del metadata para personalizar colores, textos y diseño
   - Si no hay metadata, usa valores por defecto
   - Los paquetes y precios se cargan automáticamente desde el offering

### 🎯 Cómo Usar:

**1. Verificar si el usuario es Premium:**
```tsx
import { useRevenueCat } from '@/providers/RevenueCatProvider';

function MyComponent() {
  const { isPro } = useRevenueCat();
  
  if (isPro) {
    // Usuario premium, mostrar contenido completo
  } else {
    // Usuario gratuito, mostrar paywall
  }
}
```

**2. Mostrar el Paywall:**
```tsx
import { useState } from 'react';
import SubscriptionPaywall from '@/components/SubscriptionPaywall';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);
  
  return (
    <>
      <TouchableOpacity onPress={() => setShowPaywall(true)}>
        <Text>Hazte Premium</Text>
      </TouchableOpacity>
      
      <SubscriptionPaywall 
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </>
  );
}
```

**3. Acceder a más información:**
```tsx
const { 
  offerings,      // Todos los offerings disponibles
  customerInfo,   // Información completa del cliente
  isLoading,      // Estado de carga
  isPro,          // Boolean si tiene acceso premium
  purchasePackage,// Función para comprar
  restorePurchases,// Función para restaurar
  getProducts     // Obtener lista de productos
} = useRevenueCat();
```

---

## 💡 Recursos Útiles

- [RevenueCat Dashboard](https://app.revenuecat.com)
- [RevenueCat Docs](https://docs.revenuecat.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
