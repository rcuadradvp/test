import api from '@/services/api';
import { AppStorage } from '@/services/storage';
import { AsyncStorageKeys } from '@/constants/storage';
import { Endpoints } from '@/constants/api';
import type { Device, AuthorizedDevicesMap, DevicesResponse } from '@/types';

function formatMacWithColons(mac: string): string {
  if (!mac) return '';
  
  const normalized = mac.replace(/[:\-\s]/g, '').toUpperCase().trim();
  
  if (normalized.length !== 12 || !/^[0-9A-F]{12}$/.test(normalized)) {
    console.warn('[DeviceService] Invalid MAC format:', mac);
    return mac;
  }
  return normalized.match(/.{1,2}/g)?.join(':') || mac;
}

export const DeviceService = {

  async fetchDevices(): Promise<Device[]> {
    try {
      const response = await api.get<DevicesResponse>(Endpoints.DEVICES.BASE);
      return response.data.data;
    } catch (error) {
      console.error('[DeviceService] Error fetching devices:', error);
      throw error;
    }
  },

  async syncAuthorizedDevices(): Promise<AuthorizedDevicesMap> {
    try {
      const devices = await this.fetchDevices();
      const devicesMap: AuthorizedDevicesMap = {};
      devices.forEach(device => {
        const formattedMac = formatMacWithColons(device.mac);
        devicesMap[formattedMac] = device.name;
      });

      await AppStorage.set(AsyncStorageKeys.AUTHORIZED_DEVICES_MAP, devicesMap);
      await AppStorage.set(AsyncStorageKeys.LAST_DEVICE_SYNC, Date.now().toString());

      return devicesMap;
    } catch (error) {
      console.error('[DeviceService] Error syncing authorized devices:', error);
      throw error;
    }
  },

  async getAuthorizedDevicesMap(): Promise<AuthorizedDevicesMap | null> {
    try {
      const devicesMapString = await AppStorage.get(AsyncStorageKeys.AUTHORIZED_DEVICES_MAP);
      
      if (!devicesMapString) {
        return null;
      }
      const devicesMap: AuthorizedDevicesMap = JSON.parse(devicesMapString);
      return devicesMap;
    } catch (error) {
      console.error('[DeviceService] Error getting authorized devices map:', error);
      return null;
    }
  },

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AppStorage.get(AsyncStorageKeys.LAST_DEVICE_SYNC);
      
      if (!timestamp) {
        return null;
      }

      return new Date(parseInt(timestamp, 10));
    } catch (error) {
      console.error('[DeviceService] Error getting last sync time:', error);
      return null;
    }
  },

  async clearAuthorizedDevices(): Promise<void> {
    try {
      await AppStorage.remove(AsyncStorageKeys.AUTHORIZED_DEVICES_MAP);
      await AppStorage.remove(AsyncStorageKeys.LAST_DEVICE_SYNC);
      console.log('[DeviceService] Cleared authorized devices');
    } catch (error) {
      console.error('[DeviceService] Error clearing authorized devices:', error);
    }
  },

  async isDeviceAuthorized(mac: string): Promise<{ authorized: boolean; name?: string }> {
    try {
      const devicesMap = await this.getAuthorizedDevicesMap();
      
      if (!devicesMap) {
        return { authorized: false };
      }

      const formattedMac = formatMacWithColons(mac);
      const name = devicesMap[formattedMac];
      
      return {
        authorized: !!name,
        name,
      };
    } catch (error) {
      console.error('[DeviceService] Error checking device authorization:', error);
      return { authorized: false };
    }
  },
};