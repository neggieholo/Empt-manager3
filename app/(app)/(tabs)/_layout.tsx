import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TenantTabsLayout() {
  const brandColor = "rgba(54, 170, 143, 1)";

  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#FFFFFF", // White text/icons when active
          tabBarInactiveTintColor: "rgba(255, 255, 255, 0.6)", // Faded white when inactive
          tabBarStyle: { backgroundColor: brandColor }, // Teal Tab Bar
          headerStyle: { backgroundColor: brandColor }, // Teal Header
          headerTintColor: "#FFFFFF", // White back button/title
          headerTitleAlign: "center",
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="Profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="Records"
          options={{
            title: "Records",
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="Subordinates"
          options={{
            title: "My Subordinates",
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}