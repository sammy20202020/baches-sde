/**
 * RF-10: notificaciones push de cambio de estado.
 *
 * El permiso se pide en el momento de uso, no al abrir la app, y si el usuario
 * lo rechaza la app sigue funcionando: el estado tambien se ve en "Mis reportes".
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarParaPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // los emuladores no reciben push

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('estados', {
      name: 'Estado de mis reportes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: actual } = await Notifications.getPermissionsAsync();
  let status = actual;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await api.post('/auth/dispositivo', {
    expo_push_token: token,
    plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
    notificaciones_activas: true,
  });

  return token;
}
