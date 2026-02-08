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

    const newSocket = io("http://10.35.61.113:3060", {
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
      // data = { user: "Worker Name", location: { latitude, longitude, address }, date: "..." }
      console.log(`📍 Received location for ${data.user}`);

      setWorkerLocations((prev) => ({
        ...prev,
        [data.user]: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address,
          timestamp: data.location.timestamp,
        },
      }));
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
    // Only run if there are actually workers to check
    console.log("workerLocations:", workerLocations);
    if (Object.keys(workerLocations).length === 0) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const twelveSeconds = 12 * 1000;
      let hasChanged = false;

      setWorkerLocations((prev) => {
        const updated = { ...prev };

        for (const [name, data] of Object.entries(updated)) {
          const lastSeen =
            typeof data.timestamp === "number"
              ? data.timestamp
              : new Date(data.timestamp).getTime();

          if (!isNaN(lastSeen) && now - lastSeen > twelveSeconds) {
            console.log(
              `🧹 Removing ${name} - Last update was ${Math.round((now - lastSeen) / 1000)}s ago`,
            );
            delete updated[name];
            hasChanged = true;
          }
        }

        return hasChanged ? updated : prev; // Only trigger re-render if someone was removed
      });
    }, 5000); // Check every 5 seconds

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

  // Inside MonitoringProvider.tsx

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
