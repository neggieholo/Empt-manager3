import { useMonitoring } from "@/app/SocketContext";
import { LocationState } from "@/app/Types/Socket";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import * as LocationModule from "../../../modules/LocationModule";
import "../../global.css";

export default function Dashboard() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const webViewRef = useRef<WebView>(null);
  const {
    onlineMembers,
    clockEvents,
    sendLocation,
    workerLocations,
    userName,
  } = useMonitoring();

  useEffect(() => {
    const startTrackingSafely = async () => {
      console.log("Checking permissions...");

      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        try {
          // This triggers the native Android popup to turn on Location
          await Location.enableNetworkProviderAsync();
        } catch (error: any) {
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
      setLocation(data);
      sendLocation(data);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!webViewRef.current) return;

    if (location?.latitude && location?.longitude) {
      const selfScript = `updateSelf(${parseFloat(location.latitude.toString())}, ${parseFloat(location.longitude.toString())});`;
      webViewRef.current.injectJavaScript(selfScript);
    }

    if (workerLocations) {
      Object.entries(workerLocations).forEach(([name, data]) => {
        if (name !== userName && data.latitude && data.longitude) {
          const workerScript = `updateWorker("${name}", ${parseFloat(data.latitude.toString())}, ${parseFloat(data.longitude.toString())});`;
          webViewRef.current?.injectJavaScript(workerScript);
        }
      });
    }

    const activeNames = Object.keys(workerLocations);
    const cleanupScript = `
      Object.keys(workerMarkers).forEach(markerName => {
        if (!${JSON.stringify(activeNames)}.includes(markerName)) {
          removeWorker(markerName);
        }
      });
    `;
    webViewRef.current.injectJavaScript(cleanupScript);
    
  }, [location, workerLocations]);

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
          var map;
          var selfMarker = null; // Separate variable for YOU
          var workerMarkers = {}; // Object for everyone else
          var isReady = false;
          var currentSelfPos = null;

          map = L.map('map', { zoomControl: false, attributionControl: false }).setView([6.5, 3.3], 12); // Default to Lagos area
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          isReady = true;

          function updateSelf(lat, lon) {
              if(!isReady || !lat || !lon || lat == 0) return;
              
              var baseLat = parseFloat(lat);
              var baseLon = parseFloat(lon);
              currentSelfPos = { lat: baseLat, lng: baseLon }; // Save for worker check

              var finalPos = [baseLat, baseLon];

              // Check if YOU are on top of any existing WORKER
              for (var name in workerMarkers) {
                  var wPos = workerMarkers[name].getLatLng();
                  if (wPos.lat === baseLat && wPos.lng === baseLon) {
                      // If you overlap a worker, offset YOUR marker
                      finalPos[0] += (Math.random() - 0.5) * 0.0001;
                      finalPos[1] += (Math.random() - 0.5) * 0.0001;
                      break; 
                  }
              }

              if (!selfMarker) {
                  selfMarker = L.marker(finalPos).addTo(map).bindPopup("<b>You</b>");
                  map.setView(finalPos, 16);
              } else {
                  selfMarker.setLatLng(finalPos);
              }
          }

          function updateWorker(name, lat, lon) {
            if(!isReady || !lat || !lon || lat == 0 || !name) return; // Stop bad data
            var offsetLat = parseFloat(lat) + (Math.random() - 0.5) * 0.0001;
            var offsetLon = parseFloat(lon) + (Math.random() - 0.5) * 0.0001;
            var pos = [offsetLat, offsetLon];
            if (!workerMarkers[name]) {
              workerMarkers[name] = L.marker(pos, {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41]
                })
              }).addTo(map).bindPopup("<b>" + name + "</b>");
            } else {
              workerMarkers[name].setLatLng(pos);
            }
          }

          function removeWorker(name) {
              if (workerMarkers[name]) {
                  map.removeLayer(workerMarkers[name]); // Remove from map
                  delete workerMarkers[name];           // Remove from our JS object
                  console.log("🗑️ Marker removed for: " + name);
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
          className="bg-yellow-500 p-1 rounded-xl shadow-sm items-center border border-gray-200"
          onPress={() => {
            router.push("/onliners");
          }}
        >
          <Text className="text-gray-800 font-semibold text-base">
            Online: {onlineMembers.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-green-500 p-1 rounded-xl shadow-sm items-center border border-gray-200"
          onPress={() => {
            router.push("/clockins");
          }}
        >
          <Text className="text-gray-800 font-semibold text-base">
            Clocked In: {clockEvents.in.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-red-500 p-1 rounded-xl shadow-sm items-center border border-gray-200"
          onPress={() => {
            router.push("/clockouts");
          }}
        >
          <Text className="text-gray-800 font-semibold text-base">
            Clocked Out: {clockEvents.out.length}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="h-80 w-[85%] mx-auto border-y border-gray-300 overflow-hidden rounded-xl bg-gray-200">
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          javaScriptEnabled={true} // 👈 Ensure this is true
          domStorageEnabled={true}
          source={{ html: mapHtml }}
          onLoadEnd={() => {
            console.log("🗺️ Map Ready: Syncing current worker states...");

            // 1. Sync Yourself
            if (location) {
              webViewRef.current?.injectJavaScript(
                `updateSelf(${location.latitude}, ${location.longitude});`,
              );
            }

            // 2. Sync all workers currently in memory
            if (workerLocations) {
              Object.entries(workerLocations).forEach(([name, data]) => {
                if (name !== userName) {
                  const syncScript = `updateWorker("${name}", ${data.latitude}, ${data.longitude});`;
                  webViewRef.current?.injectJavaScript(syncScript);
                }
              });
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

      {/* 4. Worker List Section */}
      <View className="w-[85%] mx-auto mt-2 mb-10">
        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 px-1">
          Active Team Members
        </Text>
        {Object.entries(workerLocations).length > 0 ? (
          Object.entries(workerLocations)
            .filter(([name]) => name !== userName)
            .map(([name, data]) => (
              <View
                key={name}
                className="bg-white p-4 rounded-2xl mb-3 shadow-sm flex-row items-center border border-gray-100"
              >
                <View className="h-10 w-10 rounded-full bg-blue-500 items-center justify-center mr-3">
                  <Text className="text-white font-bold">
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold">{name}</Text>
                  <Text className="text-gray-500 text-xs" numberOfLines={1}>
                    {data.address || "Fetching address..."}
                  </Text>
                </View>
              </View>
            ))
        ) : (
          <View className="p-10 items-center">
            <Text className="text-gray-400 italic text-sm">
              No workers active on map
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
