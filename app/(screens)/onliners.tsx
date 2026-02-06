// app/(app)/OnlineMembersPage.tsx
import { View, Text, FlatList } from "react-native";
import { useMonitoring } from "../SocketContext";

export default function OnlineMembersPage() {
  const { onlineMembers } = useMonitoring();

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <FlatList
        data={onlineMembers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100">
            {/* Online Indicator Dot */}
            <View className="w-3 h-3 bg-green-500 rounded-full mr-4" />
            
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-base">
                {item.firstName} {item.lastName}
              </Text>
              <Text className="text-gray-500 text-xs uppercase tracking-widest">
                {item.department} • {item.role}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text className="text-center text-gray-400 mt-10">No one is currently online</Text>
        )}
      />
    </View>
  );
}