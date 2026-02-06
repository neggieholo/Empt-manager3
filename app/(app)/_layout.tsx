import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native"; // Import navigation actions
import { router, usePathname } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Bell, Key, LogOut, UserPlus, X } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { postLogout } from "../services/api";
import { useMonitoring } from "../SocketContext";

const brandColor = "rgba(54, 170, 143, 1)";

function CustomDrawerContent(props: any) {
  const { disconnectSocket } = useMonitoring();
  const handleNavigation = (path: string) => {
    // 1. Close the drawer first
    props.navigation.dispatch(DrawerActions.closeDrawer());
    // 2. Then navigate
    router.push(path);
  };
  return (
    // Main container with the teal background
    <SafeAreaView className="flex-1 bg-[#36AA8F]">
      <View className="w-full z-50 flex-row justify-end px-2">
        <TouchableOpacity
          onPress={() => props.navigation.dispatch(DrawerActions.closeDrawer())}
          className="bg-black/20 p-2 rounded-full"
        >
          <X size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* 1. The Logo Header - Outside the ScrollView to avoid padding */}
      <View className="w-full h-56 bg-white mt-2">
        <Image
          source={require("../../assets/images/empt_logo.png")}
          className="w-full h-full"
          resizeMode="stretch" // Use stretch or contain depending on the logo aspect ratio
        />
      </View>

      {/* 2. The Scrollable Items */}
      <DrawerContentScrollView
        {...props}
        // Force zero padding on the internal container
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <View className="px-2 mt-4">
          <DrawerItem
            label="Register an Employee"
            labelStyle={{ color: "#FFFFFF", marginLeft: -6, fontWeight: "600" }}
            icon={() => <UserPlus size={22} color="#FFFFFF" />}
            onPress={() => handleNavigation("/RegisterWorker")}
          />
          <DrawerItem
            label="Change Password"
            labelStyle={{ color: "#FFFFFF", marginLeft: -6, fontWeight: "600" }}
            icon={() => <Key size={22} color="#FFFFFF" />}
            onPress={() => handleNavigation("/ChangePassword")}
          />
          <View className="h-[1px] bg-gray-200 my-4 mx-4" />

          <DrawerItem
            label="Logout"
            labelStyle={{ color: "#EF4444", marginLeft: -6, fontWeight: "600" }}
            icon={() => <LogOut size={22} color="#EF4444" />}
            onPress={async () => {
              disconnectSocket();
              const result = await postLogout();
              if (result.success) {
                router.replace("/");
              } else {
                console.log("Logout failed:", result.message);
              }
            }}
          />
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

export default function AppLayout() {
  const { userName, badgeCount } = useMonitoring();
  const pathname = usePathname();

  // Helper logic to get the title based on the path
  const getHeaderTitle = () => {
    if (pathname.includes("dashboard")) return `Hi, ${userName || "Manager"}`;
    if (pathname.includes("Profile")) return "Profile";
    if (pathname.includes("Records")) return "Records";
    if (pathname.includes("Subordinates")) return "Subordinates";
    return "";
  };

  const isDashboard = pathname.includes("dashboard");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: true, // Always show the Drawer header
          headerStyle: { backgroundColor: brandColor },
          headerTintColor: "#FFFFFF",
          drawerStyle: { width: 280, backgroundColor: brandColor },
          headerTitle: getHeaderTitle(), // Dynamic Title
          headerTitleAlign: "left", // Aligns title to left near hamburger
          headerRight: () =>
            isDashboard ? (
              // Only show the Bell on the Dashboard
              <View className="mr-4">
                <TouchableOpacity
                  onPress={() => router.push("/notifications")}
                  className="relative p-1"
                >
                  <Bell size={26} color="#FFFFFF" />
                  {badgeCount > 0 && (
                    <View
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#36AA8F]"
                      style={{ minWidth: 20, height: 20, paddingHorizontal: 4 }}
                    >
                      <Text className="text-white text-[10px] font-bold">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : null, // Hide Bell on other screens
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
