import { View, Text, FlatList } from "react-native";
import { useMonitoring } from "../SocketContext";
import { LogOut, Clock } from "lucide-react-native";

export default function ClockedOutPage() {
  const { clockEvents } = useMonitoring();

  const renderItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center bg-white mb-3 p-4 rounded-2xl shadow-sm border border-gray-100">
      <View className="bg-red-50 p-3 rounded-full mr-4">
        <LogOut size={20} color="#ef4444" />
      </View>

      <View className="flex-1">
        <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
        <Text className="text-gray-500 text-xs uppercase">{item.department}</Text>
      </View>

      <View className="items-end">
        <View className="flex-row items-center">
          <Clock size={12} color="#9ca3af" className="mr-1" />
          <Text className="text-gray-600 font-medium">
            {new Date(item.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text className="text-gray-400 text-[10px]">Clocked Out</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <FlatList
        data={clockEvents.out}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View className="items-center mt-20">
            <Text className="text-gray-400">No one has clocked out today yet.</Text>
          </View>
        )}
      />
    </View>
  );
}