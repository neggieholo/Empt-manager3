import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getSubordinates, deleteSubordinate } from '@/app/services/api'; // Adjust paths
import { Employee } from '@/app/Types/Employee';

export default function SubordinatesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchList = async () => {
    try {
      const response = await getSubordinates();
      if (response.success) setEmployees(response.employees);
    } catch (error) {
      Alert.alert("Error", "Could not load subordinates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleDelete = (workerId: string, name: string) => {
    Alert.alert(
      "Delete Employee",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const success = await deleteSubordinate(workerId);
            if (success) setEmployees(prev => prev.filter(e => e.id !== workerId));
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <View className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-lg font-bold text-gray-800">{item.fullName}</Text>
          <Text className="text-gray-500 text-sm">{item.role} • {item.department}</Text>
          
          {/* ACTION BUTTONS UNDER THE NAME */}
          <View className="flex-row mt-3 gap-4">
            <TouchableOpacity 
              onPress={() => router.push({
                pathname: "/subordinateProfile",
                params: { ...item } // Pushing all details as params
              })}
              className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full"
            >
              <Ionicons name="person-outline" size={16} color="#3b82f6" />
              <Text className="ml-1 text-blue-600 font-medium">Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleDelete(item.id, item.fullName)}
              className="flex-row items-center bg-red-50 px-3 py-1 rounded-full"
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text className="ml-1 text-red-600 font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>        
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator className="flex-1" size="large" color="#36AA8F" />;

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text className="text-center mt-10 text-gray-400">No employees found.</Text>}
      />
    </View>
  );
}