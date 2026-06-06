import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { updateOnlineStatusThunk } from '../store/courierSlice';
import { courierUpdateLocation } from '../src/api';

const LOCATION_TASK_NAME = 'background-location-task';

export default function useCourierLocation() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(s => s.auth?.isAuthenticated);
    const user = useSelector(s => s.auth?.user);
    const isOnline = useSelector(s => s.courier?.isOnline);
    const locale = useSelector(s => s.language?.locale ?? 'uk');

    const isCourier = user?.role?.toLowerCase() === 'courier' || 
                      user?.role?.toLowerCase() === 'курєр' || 
                      Number(user?.role) === 1;

    const fallbackIntervalId = useRef(null);

    useEffect(() => {
        const handleTracking = async () => {
            // Clear any existing fallback intervals first
            if (fallbackIntervalId.current) {
                clearInterval(fallbackIntervalId.current);
                fallbackIntervalId.current = null;
            }

            const shouldTrack = isAuthenticated && isCourier && isOnline;

            try {
                if (shouldTrack) {
                    console.log('📍 [Courier GPS Global] Starting tracking. Courier is online.');
                    
                    // Request Foreground permission first
                    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
                    if (fgStatus !== 'granted') {
                        console.warn('⚠️ [Courier GPS Global] Foreground location permission denied');
                        dispatch(updateOnlineStatusThunk(false));
                        return;
                    }

                    // Send initial position once immediately
                    try {
                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc?.coords) {
                            console.log(`📍 [Courier GPS Global] Initial position: lat=${loc.coords.latitude}, lng=${loc.coords.longitude}`);
                            await courierUpdateLocation(loc.coords.latitude, loc.coords.longitude);
                        }
                    } catch (err) {
                        console.warn('⚠️ [Courier GPS Global] Initial location fetch failed:', err);
                    }

                    // Request Background permission
                    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                    if (bgStatus === 'granted') {
                        console.log('📍 [Courier GPS Global] Background permission granted. Starting background updates...');
                        
                        let backgroundStarted = false;
                        try {
                            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                            if (!hasStarted) {
                                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                                    accuracy: Location.Accuracy.Balanced,
                                    timeInterval: 15000,
                                    deferredUpdatesInterval: 15000,
                                    foregroundService: {
                                        notificationTitle: locale === 'en' ? "K&M Delivery Tracking" : "Відстеження доставки K&M",
                                        notificationBody: locale === 'en' ? "Courier is online. Updating location." : "Кур'єр в мережі. Оновлюємо геопозицію.",
                                        notificationColor: "#e334e3",
                                    },
                                    pausesUpdatesAutomatically: false,
                                });
                            }
                            backgroundStarted = true;
                        } catch (taskErr) {
                            console.warn('⚠️ [Courier GPS Global] Background updates failed to start (native module missing). Falling back to foreground timer:', taskErr.message);
                        }

                        if (!backgroundStarted) {
                            // Fallback to foreground timer updates since background updates failed
                            fallbackIntervalId.current = setInterval(async () => {
                                try {
                                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                    if (loc?.coords) {
                                        console.log(`📍 [Courier GPS Global Fallback] lat=${loc.coords.latitude}, lng=${loc.coords.longitude}`);
                                        await courierUpdateLocation(loc.coords.latitude, loc.coords.longitude);
                                    }
                                } catch (err) {
                                    console.warn('⚠️ [Courier GPS Global Fallback] Failed periodic update:', err);
                                }
                            }, 15000);
                        }
                    } else {
                        console.warn('⚠️ [Courier GPS Global] Background permission denied.');
                        
                        Alert.alert(
                            locale === 'en' ? 'Background Location Required' : 'Необхідна фонова геолокація',
                            locale === 'en'
                                ? 'To work on shift, you must allow location access to "Always" in your device settings so customers can track their order.'
                                : 'Для роботи на зміні необхідно дозволити доступ до геопозиції "Завжди" (iOS) або "Дозволити в будь-якому режимі" (Android) в налаштуваннях пристрою, щоб клієнти могли бачити ваше місцезнаходження.',
                            [
                                {
                                    text: locale === 'en' ? 'Open Settings' : 'Налаштування',
                                    onPress: () => {
                                        Linking.openSettings();
                                        dispatch(updateOnlineStatusThunk(false));
                                    }
                                },
                                {
                                    text: locale === 'en' ? 'Cancel' : 'Скасувати',
                                    onPress: () => dispatch(updateOnlineStatusThunk(false)),
                                    style: 'cancel'
                                }
                            ],
                            { cancelable: false }
                        );

                        // Fallback foreground timer updates just in case
                        fallbackIntervalId.current = setInterval(async () => {
                            try {
                                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                if (loc?.coords) {
                                    console.log(`📍 [Courier GPS Global Fallback] lat=${loc.coords.latitude}, lng=${loc.coords.longitude}`);
                                    await courierUpdateLocation(loc.coords.latitude, loc.coords.longitude);
                                }
                            } catch (err) {
                                console.warn('⚠️ [Courier GPS Global Fallback] Failed periodic update:', err);
                            }
                        }, 15000);
                    }
                } else {
                    // Stop tracking
                    console.log('📍 [Courier GPS Global] Stopping tracking. Courier offline/unauthenticated.');
                    try {
                        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                        if (hasStarted) {
                            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                        }
                    } catch (taskErr) {
                        console.warn('⚠️ [Courier GPS Global] Failed to stop background updates (native module missing):', taskErr.message);
                    }
                }
            } catch (err) {
                console.error('❌ [Courier GPS Global] Error in handleTracking:', err);
            }
        };

        handleTracking();

        return () => {
            if (fallbackIntervalId.current) {
                clearInterval(fallbackIntervalId.current);
                fallbackIntervalId.current = null;
            }
        };
    }, [isAuthenticated, isCourier, isOnline, locale, dispatch]);
}
