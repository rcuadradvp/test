// components/scanner/BeaconList/BeaconList.tsx
import { FlatList, RefreshControl } from 'react-native';
import { BeaconItem } from '@/components/scanner/BeaconItem';
import { EmptyBeaconState } from '@/components/scanner/EmptyBeaconState';
import type { MinewBeacon } from '@/services/minew-scanner';

interface BeaconListProps {
  beacons: MinewBeacon[];
  isScanning: boolean;
  onRefresh: () => void;
}

export function BeaconList({ 
  beacons, 
  isScanning, 
  onRefresh 
}: BeaconListProps) {
  return (
    <FlatList
      data={beacons}
      keyExtractor={(item) => item.mac}
      renderItem={({ item }) => <BeaconItem beacon={item} />}
      contentContainerStyle={{ 
        padding: 16, 
        flexGrow: 1 
      }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
        />
      }
      ListEmptyComponent={
        <EmptyBeaconState isScanning={isScanning} />
      }
    />
  );
}