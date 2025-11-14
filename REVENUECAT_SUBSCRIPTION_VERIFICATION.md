# RevenueCat Subscription Verification - Guía de Integración

## Descripción General

Este sistema permite verificar automáticamente el estado de las suscripciones de usuarios que tienen datos de procesador de RevenueCat asociados. Cuando un usuario tiene `processorData.customId`, el sistema consulta a RevenueCat para obtener el estado actual de su suscripción y calcula si está activa.

## Estructura del Sistema

### 1. Backend - Servicio RevenueCat (`backend/services/revenuecat.ts`)

Este archivo contiene las funciones principales para interactuar con la API de RevenueCat:

- **`getSubscriptionByCustomId(customId: string)`**: Obtiene los datos de suscripción desde la API de RevenueCat
- **`calculateBadge(subscription)`**: Calcula si la suscripción está activa basándose en las fechas
- **`getUserSubscriptionStatus(customId: string)`**: Función principal que combina las dos anteriores

#### Configuración Requerida

Debes configurar la variable de entorno:
```
REVENUECAT_API_URL=https://tu-api-revenuecat.com
```

### 2. Backend - Endpoint API (`backend/hono.ts`)

Se agregó un nuevo endpoint:

```
GET /api/user/:userId/subscription
```

Este endpoint:
1. Busca el usuario en MongoDB por `userId`
2. Verifica si tiene `processorData.customId`
3. Si lo tiene, llama a RevenueCat para obtener el estado de la suscripción
4. Calcula el badge (isActive) basándose en las fechas
5. Retorna el usuario y el estado de la suscripción

### 3. Frontend - Cliente API (`lib/api-client.ts`)

Se agregaron:
- Interfaces TypeScript para los tipos de datos:
  - `BFFRevenueCatSubscription`
  - `BFFRevenueCatBadge`
  - `BFFUserWithSubscription`

- Nuevo método en el cliente API:
  ```typescript
  apiClient.user.getWithSubscription(userId: string)
  ```

## Estructura de Datos

### Entrada - Usuario con processorData

```json
{
  "_id": "user123",
  "email": "user@example.com",
  "processorData": {
    "customId": "rc_sub_abc123xyz"
  }
}
```

### Salida - Respuesta Completa

```json
{
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "processorData": {
      "customId": "rc_sub_abc123xyz"
    }
  },
  "subscription": {
    "isActive": true,
    "subscriptionStatus": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "planName": "Premium Monthly",
    "amount": 9.99,
    "currency": "USD"
  }
}
```

## Cálculo de isActive

El sistema calcula `isActive` comparando la fecha actual con `startDate` y `endDate`:

```typescript
const now = new Date();
const startDate = new Date(subscription.startDate);
const endDate = new Date(subscription.endDate);

const isActive = now >= startDate && now <= endDate;
```

- **isActive = true**: Si la fecha actual está entre `startDate` y `endDate` (inclusive)
- **isActive = false**: Si la fecha actual está fuera de ese rango

## Uso en el Cliente

### Ejemplo con React Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

function UserSubscriptionStatus({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-subscription', userId],
    queryFn: () => apiClient.user.getWithSubscription(userId),
  });

  if (isLoading) return <Text>Cargando...</Text>;
  if (error) return <Text>Error al cargar suscripción</Text>;

  return (
    <View>
      <Text>Usuario: {data.user.email}</Text>
      <Text>Estado: {data.subscription.isActive ? 'Activo' : 'Inactivo'}</Text>
      <Text>Plan: {data.subscription.planName}</Text>
      <Text>Vence: {new Date(data.subscription.endDate).toLocaleDateString()}</Text>
    </View>
  );
}
```

## Configuración de RevenueCat API

### Pasos necesarios:

1. **Configurar la URL de la API de RevenueCat**
   - Agrega `REVENUECAT_API_URL` a tu archivo `.env` o configuración de variables de entorno
   - La URL debe apuntar a tu backend de RevenueCat que maneja las subscripciones

2. **Implementar el endpoint de RevenueCat**
   - Necesitas tener un endpoint en tu infraestructura de RevenueCat que devuelva los datos de suscripción dado un `customId`
   - El endpoint debe retornar un objeto con la estructura `BFFRevenueCatSubscription`

3. **Configurar MongoDB**
   - Asegúrate de que `MONGO_URI` esté configurado en tus variables de entorno
   - La colección de usuarios debe tener el campo `processorData.customId` para los usuarios con suscripciones de RevenueCat

## Variables de Entorno Requeridas

```env
# MongoDB
MONGO_URI=mongodb://...

# RevenueCat API
REVENUECAT_API_URL=https://tu-api-revenuecat.com

# App URL (para las llamadas del cliente al backend)
EXPO_PUBLIC_APP_URL=http://localhost:8081 # o tu URL de producción
```

## Casos de Uso

### Caso 1: Usuario con processorData.customId
- Sistema obtiene el usuario de MongoDB
- Encuentra `processorData.customId`
- Llama a RevenueCat API
- Calcula isActive basado en fechas
- Retorna usuario + subscription badge

### Caso 2: Usuario sin processorData
- Sistema obtiene el usuario de MongoDB
- No encuentra `processorData.customId`
- Retorna usuario + badge con status "no_processor_data"

### Caso 3: Usuario no existe
- Sistema intenta obtener el usuario de MongoDB
- Usuario no existe
- Retorna error 404

## Logs y Debugging

El sistema incluye logging extensivo para facilitar el debugging:

```
[Hono] Getting user with subscription status for userId: xxx
[Hono] User found: {...}
[Hono] User has processorData.customId: xxx
[RevenueCat Service] Fetching subscription for customId: xxx
[RevenueCat Service] Subscription data received: {...}
[Hono] Subscription badge calculated: {...}
```

## Manejo de Errores

El sistema maneja varios tipos de errores:

1. **Usuario no encontrado**: Retorna 404
2. **Error de RevenueCat API**: Retorna 500 con el mensaje de error
3. **Usuario sin processorData**: Retorna badge con status "no_processor_data"
4. **Suscripción no encontrada en RevenueCat**: Retorna badge con isActive=false

## Próximos Pasos

1. **Configurar las variables de entorno** mencionadas arriba
2. **Implementar el endpoint de RevenueCat** que devuelve los datos de suscripción
3. **Agregar el campo `processorData`** a los usuarios en MongoDB que tienen suscripciones
4. **Probar el endpoint** usando el userId de un usuario con suscripción
5. **Integrar en tu UI** usando React Query u otro sistema de data fetching

## Ejemplo de Integración Completa

```typescript
// En tu componente de perfil o dashboard
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useUserSession } from '@/providers/UserSession';

export function ProfileScreen() {
  const { session } = useUserSession();
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-subscription', session?.userId],
    queryFn: () => apiClient.user.getWithSubscription(session!.userId),
    enabled: !!session?.userId,
  });

  if (isLoading) return <LoadingSpinner />;

  const isSubscriptionActive = data?.subscription.isActive;
  const subscriptionStatus = data?.subscription.subscriptionStatus;

  return (
    <View>
      <Text>Email: {data?.user.email}</Text>
      
      {isSubscriptionActive ? (
        <View>
          <Text>✅ Suscripción Activa</Text>
          <Text>Plan: {data?.subscription.planName}</Text>
          <Text>Vence: {new Date(data.subscription.endDate).toLocaleDateString()}</Text>
        </View>
      ) : (
        <View>
          <Text>❌ Sin Suscripción Activa</Text>
          <Text>Estado: {subscriptionStatus}</Text>
          <Button title="Suscribirse" onPress={handleSubscribe} />
        </View>
      )}
    </View>
  );
}
```

## Soporte

Si tienes problemas con la integración:
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs del backend para ver dónde falla
3. Asegúrate de que el usuario tenga `processorData.customId` en MongoDB
4. Verifica que la API de RevenueCat esté respondiendo correctamente
