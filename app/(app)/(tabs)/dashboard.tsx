import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import * as LocationModule from "../../../modules/LocationModule";
import "../../global.css";
import { useMonitoring } from "@/app/SocketContext";
import { router } from "expo-router";

type LocationState = {
  latitude: number;
  longitude: number;
  address?: string | null;
};

export default function Dashboard() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const webViewRef = useRef<WebView>(null);
  const { onlineMembers, clockEvents } = useMonitoring();

  useEffect(() => {
    const startTrackingSafely = async () => {
      console.log("Checking permissions...");

      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        try {
          // This triggers the native Android popup to turn on Location
          await Location.enableNetworkProviderAsync();
        } catch (error:any) {
          console.log("User refused to enable location services");
          return; // Stop if they won't turn it on
        }
      }
      const ignored = await LocationModule.isBatteryOptimizationIgnored();

      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus === "granted") {
        await Location.requestBackgroundPermissionsAsync();

        console.log("Permissions granted, starting native module...");
        if (!ignored) {
          try {
            LocationModule.requestBatteryOptimization();
          } catch (e) {
            console.log("Battery setting popup skipped or failed", e);
          }
        }
        try {
          LocationModule.startTracking();
        } catch (e) {
          console.error("Failed to start native tracking", e);
        }
      }
    };

    startTrackingSafely();

    // 3. LISTEN for the updates coming from Kotlin
    const subscription = LocationModule.addLocationListener((data) => {
      // console.log("Update received in UI:", data);
      if (webViewRef.current) {
        const moveScript = `updateMap(${data.latitude}, ${data.longitude});`;
        webViewRef.current.injectJavaScript(moveScript);
      }
      setLocation(data);
    });

    return () => {
      subscription.remove();
    };
  }, []); // Remove location from dependency array to prevent effect loops

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; }
          #map { height: 100vh; width: 100vw; }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map, marker;

          // Initialize Map immediately
          map = L.map('map', { 
            zoomControl: false,
            attributionControl: false 
          }).setView([0, 0], 2);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          // Function called from React Native
          function updateMap(lat, lon) {
            if (!map) return;
            
            var newPos = [lat, lon];
            
            if (!marker) {
              // First time: Create marker and center map
              marker = L.marker(newPos).addTo(map);
              map.setView(newPos, 16);
            } else {
              // Updates: Move marker and pan smoothly
              marker.setLatLng(newPos);
              map.panTo(newPos);
            }
          }
        </script>
      </body>
    </html>
  `;

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ paddingVertical: 25 }} // Added spacing for status bar and bottom
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Vertically Stacked Buttons at the Top */}
      <View className="flex gap-3 mb-5 w-[85%] mx-auto">
        <TouchableOpacity 
        className="bg-yellow-500 p-4 rounded-xl shadow-sm items-center border border-gray-200"
        onPress={()=>{router.push('/onliners')}}>
          <Text className="text-gray-800 font-semibold text-base">
            Online: {onlineMembers.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
        className="bg-green-500 p-4 rounded-xl shadow-sm items-center border border-gray-200"
        onPress={()=>{router.push('/clockins')}}>
          <Text className="text-gray-800 font-semibold text-base">
            Clocked In: {clockEvents.in.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
        className="bg-red-500 p-4 rounded-xl shadow-sm items-center border border-gray-200"
        onPress={()=>{router.push('/clockouts')}}>
          <Text className="text-gray-800 font-semibold text-base">
            Clocked Out: {clockEvents.out.length}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="h-80 w-[85%] mx-auto border-y border-gray-300 overflow-hidden rounded-xl bg-gray-200">
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          scrollEnabled={false}
          className="flex-1"
          // Use location to set the INITIAL state, but don't bind the
          // whole HTML string to the location state to avoid re-renders.
          source={{ html: mapHtml }}
          onLoadEnd={() => {
            if (location) {
              const initScript = `updateMap(${location.latitude}, ${location.longitude});`;
              webViewRef.current?.injectJavaScript(initScript);
            }
          }}
        />
      </View>

      {/* 3. Location Address at the Bottom */}
      <View className="p-6 items-center">
        <Text className="text-gray-500 text-xs tracking-widest uppercase mb-1">
          Your current location:
        </Text>

        <Text className="text-gray-900 text-lg font-bold text-center leading-6">
          {location?.address ?? "Resolving address..."}
        </Text>

        {location && (
          <View className="mt-2 bg-gray-200 px-3 py-1 rounded-full">
            <Text className="text-gray-600 text-[10px] font-mono">
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
