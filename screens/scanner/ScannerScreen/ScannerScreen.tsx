// screens/scanner/ScannerScreen/ScannerScreen.tsx
import { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMinewScanner } from '@/hooks/useMinewScanner';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { BeaconList } from '@/components/scanner/BeaconList';

export function ScannerScreen() {
  const {
    isScanning,
    beacons,
    error,
    startScan,
    stopScan,
    clearDevices,
  } = useMinewScanner();

  const sortedBeacons = useMemo(() => {
    return [...beacons].sort((a, b) => {
      // Primero por RSSI (señal más fuerte primero)
      if (b.rssi !== a.rssi) {
        return b.rssi - a.rssi;
      }
      // Luego por nombre
      const nameA = a.name || a.mac;
      const nameB = b.name || b.mac;
      return nameA.localeCompare(nameB);
    });
  }, [beacons]);

  const handleToggleScan = useCallback(async () => {
    if (isScanning) {
      await stopScan();
    } else {
      await startScan();
    }
  }, [isScanning, startScan, stopScan]);

  const handleRefresh = useCallback(() => {
    clearDevices();
    if (!isScanning) {
      startScan();
    }
  }, [isScanning, startScan, clearDevices]);

  return (
    <SafeAreaView className="flex-1 bg-background-50" edges={['top']}>
      <ScannerHeader
        isScanning={isScanning}
        beaconCount={beacons.length}
        error={error}
        onToggleScan={handleToggleScan}
      />
      
      <BeaconList
        beacons={sortedBeacons}
        isScanning={isScanning}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
}