import { View, Text, FlatList } from "react-native";
import { useMonitoring } from "../SocketContext";

export default function ClockedInPage() {
  const { clockEvents } = useMonitoring();

  const renderItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center bg-white mb-3 p-4 rounded-2xl shadow-sm border-l-4 border-green-500">
      <View className="flex-1">
        <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
        <Text className="text-gray-400 text-xs">{item.department}</Text>
      </View>

      <View className="bg-green-50 px-3 py-1 rounded-lg">
        <Text className="text-green-600 font-bold text-xs">
          IN: {new Date(item.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <FlatList
        data={clockEvents.in}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={() => (
           <Text className="text-center text-gray-400 mt-10">No active clock-ins found.</Text>
        )}
      />
    </View>
  );
}