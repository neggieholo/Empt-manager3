import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

export default function ProfileDetail() {
  const params = useLocalSearchParams();

  return (
    <View className="flex-1 p-6 bg-white">
      <Text className="text-3xl font-bold mb-6">{params.fullName}</Text>
      
      <View className="gap-y-4">
        <DetailRow label="Email" value={params.email} />
        <DetailRow label="Phone" value={params.phoneNumber} />
        <DetailRow label="Department" value={params.department} />
        <DetailRow label="Role" value={params.role} />
        <DetailRow label="Gender" value={params.gender} />
      </View>
    </View>
  );
}

const DetailRow = ({ label, value }: { label: string; value: any }) => (
  <View className="border-b border-gray-100 pb-2">
    <Text className="text-gray-400 text-xs uppercase tracking-wider">{label}</Text>
    <Text className="text-lg text-gray-800">{value || "N/A"}</Text>
  </View>
);