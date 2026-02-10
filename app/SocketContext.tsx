import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";
import { fetchTodayClock, postLogout } from "./services/api";
import { CleanClockEvent } from "./Types/Employee";
import {
  CleanNotification,
  CleanSocketUser,
  LocationState,
  MonitoringContextType,
} from "./Types/Socket";

export const MonitoringContext = createContext<
  MonitoringContextType | undefined
>(undefined);

export default function MonitoringProvider({
  children,
}: {
  children: ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  // Auth States
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Data States
  const [onlineMembers, setOnlineMembers] = useState<CleanSocketUser[]>([]);
  const [notifications, setNotifications] = useState<CleanNotification[]>([]);
  const [clockEvents, setClockEvents] = useState<{
    in: CleanClockEvent[];
    out: CleanClockEvent[];
  }>({ in: [], out: [] });

  const [workerLocations, setWorkerLocations] = useState<Record<string, any>>(
    {},
  );

  const [pendingTap, setPendingTap] = useState(false);
  // 1. Add this Ref at the top of your component (near other refs)
  const isHandlingRedirect = useRef(false);

  const badgeCount = notifications.length;

  const disconnectSocket = () => {
    if (socketRef.current) {
      console.log("🔌 Manually disconnecting socket...");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  useEffect(() => {
    // Only connect if we have a valid session ID from login
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const newSocket = io("http://192.168.8.193:3060", {
      path: "/api/socket.io", // 👈 MUST match the server path exactly
      transports: ["websocket"],
      autoConnect: true,
      extraHeaders: {
        cookie: `connect.sid=${sessionId}`,
      },
      auth: {
        push_token: pushToken,
      },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Manager Connected via Session ID");
    });

    newSocket.on("onlineCheck", (users: CleanSocketUser[]) => {
      console.log("Online members update:", users);
      setOnlineMembers(users);
    });

    newSocket.on(
      "messages",
      (data: CleanNotification | CleanNotification[]) => {
        setNotifications((prev) => {
          const incoming = Array.isArray(data) ? data : [data];

          // Combine and remove duplicates based on the _id from your logs
          const combined = [...incoming, ...prev];
          return combined.filter(
            (v, i, a) => a.findIndex((t) => t._id === v._id) === i,
          );
        });
      },
    );

    newSocket.on("user_location", (data) => {
      console.log(`📍 Received location for ${data.user}`);

      setWorkerLocations((prev) => {
        let lat = parseFloat(data.location.latitude);
        let lon = parseFloat(data.location.longitude);

        // 1. Check for overlap, but EXCLUDE the worker who just sent the data
        const isOverlapping = Object.entries(prev).some(
          ([workerName, workerData]: [string, any]) => {
            // Only compare if it's a DIFFERENT person
            if (workerName !== data.user) {
              return (
                parseFloat(workerData.latitude) === lat &&
                parseFloat(workerData.longitude) === lon
              );
            }
            return false;
          },
        );

        if (isOverlapping) {
          // Apply offset only if they are standing on SOMEONE ELSE'S spot
          lat = lat + (Math.random() - 0.5) * 0.0001;
          lon = lon + (Math.random() - 0.5) * 0.0001;
          console.log(
            `⚠️ Overlap found for ${data.user} with another worker. Offset applied.`,
          );
        }

        return {
          ...prev,
          [data.user]: {
            latitude: lat,
            longitude: lon,
            address: data.location.address,
            timestamp: data.location.timestamp,
          },
        };
      });
    });

    newSocket.on("notification_deleted", (id: string) => {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    });

    newSocket.on("all_notifications_deleted", () => setNotifications([]));

    newSocket.on("disconnect", async (reason) => {
      setIsConnected(false);
      console.log("❌ Manager Disconnected");
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        try {
          await postLogout();
          setSessionId(null); // Clear local state
          router.replace("/");
          // Alert.alert(
          //   "Session Ended",
          //   "You have been logged out by the server.",
          // );
        } catch (err) {
          router.replace("/");
        }
      } else {
        // It was just a network drop! Socket.io will try to reconnect automatically.
        console.log("Keep calm, attempting to reconnect...");
      }
    });

    socketRef.current = newSocket; // 2. Assign to ref instead of state

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [sessionId, pushToken, router]);

  useEffect(() => {
    // 1. Initial check: if no workers, don't even start the interval
    if (!workerLocations || Object.keys(workerLocations).length === 0) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiryLimit = 12 * 1000; // 12 seconds
      let hasChanged = false;

      setWorkerLocations((prev) => {
        const updated = { ...prev };

        for (const [name, data] of Object.entries(updated)) {
          // Handle both Number (local) and ISO String (server) formats
          const lastSeen =
            typeof data.timestamp === "number"
              ? data.timestamp
              : Date.parse(data.timestamp); // Date.parse is faster for ISO strings

          // Check for invalid dates or staleness
          if (isNaN(lastSeen) || now - lastSeen > expiryLimit) {
            console.log(
              `🧹 Removing ${name}: ${isNaN(lastSeen) ? "Invalid timestamp" : `Stale by ${Math.round((now - lastSeen) / 1000)}s`}`,
            );
            delete updated[name];
            hasChanged = true;
          }
        }

        return hasChanged ? updated : prev;
      });
    }, 5000); // Heartbeat check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, [workerLocations]);

  useEffect(() => {
    // Only start polling if we are connected/authenticated
    if (!sessionId) return;

    const performFetch = async () => {
      console.log("🔄 Background Polling: Fetching Clock Events...");
      const data = await fetchTodayClock();
      setClockEvents({
        in: data.clockedInEvents,
        out: data.clockedOutEvents,
      });
    };

    // Initial fetch
    performFetch();

    // Polling every 5 seconds
    const interval = setInterval(performFetch, 5000);

    return () => {
      console.log("🛑 Stopping Background Polling");
      clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Create the Channel (Mandatory for Android Dev Builds)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Channel",
          importance: Notifications.AndroidImportance.MAX,
          showBadge: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // 2. Set the handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }; // <--- This closes setupNotifications

    setupNotifications(); // <--- Now it's called correctly inside useEffect
  }, []);

  // 2. The combined notification logic
  useEffect(() => {
    const handleRedirect = (data: any) => {
      // If we are already moving or just moved, stop.
      if (isHandlingRedirect.current) return;

      if (sessionId) {
        isHandlingRedirect.current = true;
        console.log("🚀 Navigating to notifications...");

        // Use push or replace
        router.push("/notifications");

        // Reset the lock after 2 seconds to allow future valid taps
        setTimeout(() => {
          isHandlingRedirect.current = false;
        }, 2000);
      } else {
        console.log("⏳ Saving tap for after login");
        setPendingTap(true);
      }
    };

    // NEW: The modern way to handle notifications (including Cold Starts)
    // addNotificationResponseReceivedListener handles both background and
    // the initial notification that opened the app.
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleRedirect(response.notification.request.content.data);
      },
    );

    return () => subscription.remove();
  }, [sessionId, router]);

  // 3. The "After Login" trigger
  useEffect(() => {
    if (sessionId && pendingTap && !isHandlingRedirect.current) {
      isHandlingRedirect.current = true;
      console.log("✅ Session ready, fulfilling pending tap");
      router.push("/notifications");
      setPendingTap(false);

      setTimeout(() => {
        isHandlingRedirect.current = false;
      }, 2000);
    }
  }, [sessionId, pendingTap]);

  const sendLocation = (location: LocationState) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("user_location", {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        timestamp: location.timestamp,
      });
      console.log(
        `📍 Location sent: ${location.latitude}, ${location.longitude}`,
      );
    }
  };

  const emitLogout = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log("📤 Emitting employee_logged_out...");
      socketRef.current.emit("employee_logged_out");
    } else {
      console.warn("⚠️ Socket not connected, could not emit logout event");
    }
  };

  const deleteNotification = (notificationId: string) => {
    socketRef.current?.emit("delete_notification", { notificationId });
  };

  const deleteAll = () => {
    socketRef.current?.emit("delete_all_notifications");
  };

  return (
    <MonitoringContext.Provider
      value={{
        onlineMembers,
        clockEvents,
        workerLocations,
        notifications,
        badgeCount,
        isConnected,
        userName,
        setUserName,
        sessionId,
        pushToken,
        setSessionId,
        setPushToken,
        sendLocation,
        deleteNotification,
        deleteAll,
        emitLogout,
        disconnectSocket,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context)
    throw new Error("useMonitoring must be used within MonitoringProvider");
  return context;
};
