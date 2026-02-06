import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function ScreensLayout() {
  return (
    <SafeAreaProvider>
        <Stack>
          {/* Login screen */}
          <Stack.Screen
            name="ChangePassword"           // maps to app/index.tsx
            options={{
              title: "Change Password", // custom title
              headerShown: true,    // hide the header
            }}
          />

          {/* Register screen */}
          <Stack.Screen
            name="notifications"
            options={{
              title: "Notifications",
              headerShown: true,
            }}
          />
          
          <Stack.Screen
            name="onliners"
            options={{
              title: "Online Members",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="clockins"
            options={{
              title: "Clocked In Members",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="clockouts"
            options={{
              title: "Clocked Out Members",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="RegisterWorker"
            options={{
              title: "Register Worker",
              headerShown: true,
            }}
          />

          <Stack.Screen
            name="subordinateProfile"
            options={{
              title: "Subordinate Profile",
              headerShown: true,
            }}
          />
        </Stack>
    </SafeAreaProvider>
  );
}
