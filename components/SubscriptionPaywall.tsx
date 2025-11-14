import React, { useState, useEffect } from 'react';
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
import { Image } from 'expo-image';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
  offeringIdentifier?: string;
  paywallName?: string;
}

interface PaywallConfig {
  id: string;
  display_name: string;
  background_image_url?: string;
  background_color?: string;
  text_color?: string;
  call_to_action_background_color?: string;
  call_to_action_text_color?: string;
  header_text?: string;
  body_text?: string;
  call_to_action_text?: string;
  features?: string[];
}

export default function SubscriptionPaywall({ 
  visible, 
  onClose, 
  offeringIdentifier = 'renewal_off',
  paywallName = 'PayWall-InApp | BG completo'
}: SubscriptionPaywallProps) {
  const { offerings, isLoading, isPro, purchasePackage, restorePurchases } = useRevenueCat();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [paywallConfig, setPaywallConfig] = useState<PaywallConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web' || !visible) {
      setLoadingConfig(false);
      return;
    }

    const fetchPaywallConfig = async () => {
      try {
        setLoadingConfig(true);
        console.log('[Paywall] Fetching paywall config for:', offeringIdentifier);
        
        const response = await fetch(
          `https://api.revenuecat.com/v2/projects/proj8c5295cc/offerings/ofrng328a4a1622`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.log('[Paywall] API error:', response.status);
          setLoadingConfig(false);
          return;
        }

        const data = await response.json();
        console.log('[Paywall] Received config:', JSON.stringify(data, null, 2));
        
        if (data.metadata) {
          setPaywallConfig(data.metadata as PaywallConfig);
        }
      } catch (err) {
        console.error('[Paywall] Error fetching paywall config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchPaywallConfig();
  }, [visible, offeringIdentifier]);

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
    } catch (err) {
      console.error('[Paywall] Restore error:', err);
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

  const offering = offeringIdentifier === 'current' ? offerings?.current : offerings?.all[offeringIdentifier];
  const backgroundColor = paywallConfig?.background_color || '#170501';
  const textColor = paywallConfig?.text_color || '#FFFFFF';
  const headerText = paywallConfig?.header_text || 'Desbloquea Mental Premium';
  const bodyText = paywallConfig?.body_text || 'Acceso ilimitado a todas las hipnosis personalizadas';
  const ctaText = paywallConfig?.call_to_action_text || 'Suscribirse';
  const ctaBgColor = paywallConfig?.call_to_action_background_color || '#FFFFFF';
  const ctaTextColor = paywallConfig?.call_to_action_text_color || '#170501';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor }]}>
          {paywallConfig?.background_image_url && (
            <Image
              source={{ uri: paywallConfig.background_image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          )}
          
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />

          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <X size={24} color={textColor} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: textColor }]}>{headerText}</Text>
            <Text style={[styles.subtitle, { color: textColor }]}>
              {bodyText}
            </Text>

            {paywallConfig?.features && paywallConfig.features.length > 0 && (
              <View style={styles.featuresContainer}>
                {paywallConfig.features.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <Text style={styles.featureIcon}>✓</Text>
                    <Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}

            {loadingConfig || isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={textColor} />
                <Text style={[styles.loadingText, { color: textColor }]}>Cargando planes...</Text>
              </View>
            ) : offering && offering.availablePackages.length > 0 ? (
              <View style={styles.plansContainer}>
                {offering.availablePackages.map((pkg) => {
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
                        <View style={[styles.popularBadge, { backgroundColor: ctaBgColor }]}>
                          <Text style={[styles.popularText, { color: ctaTextColor }]}>MÁS POPULAR</Text>
                        </View>
                      )}
                      
                      <Text style={[styles.planTitle, { color: textColor }]}>{pkg.product.title}</Text>
                      <Text style={[styles.planPrice, { color: textColor }]}>{price}</Text>
                      <Text style={[styles.planDescription, { color: textColor }]}>
                        {pkg.product.description}
                      </Text>

                      {isPurchasing ? (
                        <ActivityIndicator color={ctaTextColor} style={styles.purchasingIndicator} />
                      ) : (
                        <View style={[styles.subscribeButton, { backgroundColor: ctaBgColor }]}>
                          <Text style={[styles.subscribeButtonText, { color: ctaTextColor }]}>{ctaText}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noOfferings}>
                <Text style={[styles.noOfferingsText, { color: textColor }]}>
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
                <ActivityIndicator color={textColor} size="small" />
              ) : (
                <Text style={[styles.restoreButtonText, { color: textColor }]}>Restaurar Compras</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: textColor }]}>
              Las suscripciones se renuevan automáticamente. Cancela en cualquier momento desde la configuración de tu cuenta.
            </Text>
          </ScrollView>
        </View>
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
    opacity: 0.8,
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
