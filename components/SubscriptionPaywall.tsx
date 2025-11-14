import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
  offeringIdentifier?: string;
  paywallName?: string;
}

export default function SubscriptionPaywall({ 
  visible, 
  onClose, 
  offeringIdentifier = 'current',
  paywallName 
}: SubscriptionPaywallProps) {
  const { offerings, isLoading, isPro, purchasePackage, restorePurchases } = useRevenueCat();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.container}>
          <View style={styles.webNotSupported}>
            <Text style={styles.webText}>
              Las suscripciones no están disponibles en la web.
            </Text>
            <Text style={styles.webText}>
              Por favor, usa la app en iOS o Android.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const handlePurchase = async (pkg: any) => {
    try {
      setIsPurchasing(true);
      await purchasePackage(pkg);
      Alert.alert('¡Éxito!', 'Tu suscripción ha sido activada correctamente');
      onClose();
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Error', 'No se pudo completar la compra. Por favor, intenta de nuevo.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const { customerInfo } = await restorePurchases();
      
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert('¡Éxito!', 'Tus compras han sido restauradas correctamente');
        onClose();
      } else {
        Alert.alert('No hay compras', 'No se encontraron compras anteriores');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron restaurar las compras. Por favor, intenta de nuevo.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isPro) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.container}>
          <LinearGradient colors={['#170501', '#2A0A05']} style={styles.content}>
            <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.alreadyProContainer}>
              <Text style={styles.alreadyProTitle}>¡Ya eres Premium! 🎉</Text>
              <Text style={styles.alreadyProText}>
                Tienes acceso completo a todas las funcionalidades de Mental
              </Text>
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <LinearGradient colors={['#170501', '#2A0A05']} style={styles.content}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Desbloquea Mental Premium</Text>
            <Text style={styles.subtitle}>
              Acceso ilimitado a todas las hipnosis personalizadas
            </Text>

            <View style={styles.featuresContainer}>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>✨</Text>
                <Text style={styles.featureText}>Hipnosis personalizadas ilimitadas</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🎵</Text>
                <Text style={styles.featureText}>Acceso a toda la biblioteca de audios</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureText}>Descarga y escucha offline</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🔄</Text>
                <Text style={styles.featureText}>Sincronización entre dispositivos</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Cargando planes...</Text>
              </View>
            ) : (offerings && (offerings.current || offerings.all[offeringIdentifier])) ? (
              <View style={styles.plansContainer}>
                {((offeringIdentifier === 'current' ? offerings.current : offerings.all[offeringIdentifier]) || offerings.current)?.availablePackages.map((pkg) => {
                  const price = pkg.product.priceString;
                  const isAnnual = pkg.packageType === 'ANNUAL';
                  
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[styles.planCard, isAnnual && styles.planCardFeatured]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={isPurchasing}
                    >
                      {isAnnual && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>MÁS POPULAR</Text>
                        </View>
                      )}
                      
                      <Text style={styles.planTitle}>{pkg.product.title}</Text>
                      <Text style={styles.planPrice}>{price}</Text>
                      <Text style={styles.planDescription}>
                        {pkg.product.description}
                      </Text>

                      {isPurchasing ? (
                        <ActivityIndicator color="#FFFFFF" style={styles.purchasingIndicator} />
                      ) : (
                        <View style={styles.subscribeButton}>
                          <Text style={styles.subscribeButtonText}>Suscribirse</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noOfferings}>
                <Text style={styles.noOfferingsText}>
                  No hay planes disponibles en este momento
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Las suscripciones se renuevan automáticamente. Cancela en cualquier momento desde la configuración de tu cuenta.
            </Text>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeIcon: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center' as const,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
  },
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardFeatured: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  popularBadge: {
    position: 'absolute' as const,
    top: -12,
    alignSelf: 'center' as const,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#170501',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  subscribeButtonText: {
    color: '#170501',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  purchasingIndicator: {
    paddingVertical: 14,
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    textDecorationLine: 'underline' as const,
  },
  disclaimer: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  noOfferings: {
    paddingVertical: 40,
    alignItems: 'center' as const,
  },
  noOfferingsText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  alreadyProContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  alreadyProTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  alreadyProText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneButtonText: {
    color: '#170501',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  webNotSupported: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#170501',
    padding: 40,
  },
  webText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  closeButton: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#170501',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
});
