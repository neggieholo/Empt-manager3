import { CleanClockEvent } from "../Types/Employee";
import { SearchClockResponse } from "../Types/Socket";

const BASE_URL = "http://10.35.61.113:3060/api";

export default async function postLogin(email: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/manager/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await res.json();

    return data;
  } catch (err) {
    console.log("Error:", err);
    return { success: false, message: "Network error" };
  }
}

export const postPhoneLogin = async (phoneNumber: string, password: string) => {
  try {
    const res = await fetch(`${BASE_URL}/manager/phone_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, password }),
      credentials: "include", // 🟢 Critical for session handling
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: "Network error" };
  }
};

export const postRegister = async (
  name: string,
  email: string,
  password: string,
) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/register/tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include", // for session cookies
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Registration error:", err);
    return { success: false, message: "Network error" };
  }
};

export const resetPasswordLink = async (email: string) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include", // for session cookies
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Reset password error:", err);
    return { success: false, message: "Network error" };
  }
};

export const postChangePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  try {
    const res = await fetch(`${BASE_URL}/manager/change_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: "include",
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Change password error:", err);
    return { success: false, message: "Network error" };
  }
};

/**
 * Logs out the current user and destroys the session on the server
 */
export const postLogout = async () => {
  try {
    const res = await fetch(`${BASE_URL}/logout`, {
      method: "GET", // Matches your app.get route
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Required to send the session cookie for destruction
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Logout API error:", err);
    return { success: false, message: "Network error during logout" };
  }
};

export const fetchTodayClock = async (): Promise<{
  clockedInEvents: CleanClockEvent[];
  clockedOutEvents: CleanClockEvent[];
}> => {
  try {
    const response = await fetch(`${BASE_URL}/manager/get-clock-events`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await response.json();

    if (!data.success || !Array.isArray(data.clockEvents)) {
      return { clockedInEvents: [], clockedOutEvents: [] };
    }

    const events: CleanClockEvent[] = data.clockEvents;
    const todayStr = new Date().toISOString().split("T")[0];

    const todayEvents = events.filter((event) => {
      if (!event.clockInTime) return false;
      const eventDateStr = new Date(event.clockInTime)
        .toISOString()
        .split("T")[0];
      return eventDateStr === todayStr;
    });

    todayEvents.sort(
      (a, b) =>
        new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime(),
    );

    return {
      clockedInEvents: todayEvents.filter((e) => e.status === "clocked in"),
      clockedOutEvents: todayEvents.filter((e) => e.status === "clocked out"),
    };
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    return { clockedInEvents: [], clockedOutEvents: [] };
  }
};


export const registerWorker = async (userData: any) => {
  const response = await fetch(`${BASE_URL}/manager/register_worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  // We parse the data here so the component doesn't have to
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Server registration failed");
  }

  return data;
};

export const getProfile = async () => {
  try {
    const res = await fetch(`${BASE_URL}/manager/profile`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Crucial for session-based auth
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Profile Fetch Error:", err);
    return { success: false, message: "Network error fetching profile" };
  }
};

export const getSubordinates = async () => {
  try {
    const res = await fetch(`${BASE_URL}/manager/subordinates`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    return data; // Returns { success: true, employees: [...] }
  } catch (err) {
    console.error("Fetch subordinates error:", err);
    return { success: false, message: "Network error fetching subordinates" };
  }
};

/**
 * Deletes a specific worker by ID
 * @param workerId - The MongoDB _id of the worker
 */
export const deleteSubordinate = async (workerId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/manager/subordinates/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId }),
      credentials: "include",
    });

    const data = await res.json();
    
    if (!res.ok) {
        throw new Error(data.error || "Failed to delete worker");
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    console.error("Delete subordinate error:", err);
    return { success: false, message: err.message || "Network error" };
  }
};

/**
 * Searches for clock events. 
 * All arguments are optional. If none are provided, returns 10 most recent.
 */
export const searchClockEvents = async (
  startDate?: string | null, 
  endDate?: string | null, 
  name?: string | null
): Promise<SearchClockResponse> => {
  try {
    const body: any = {};

    // 1. Handle Name (only add if string is not empty/null)
    if (name && name.trim() !== "") {
      body.name = name.trim();
    }

    // 2. Handle Dates (only add dateQuery if startDate exists)
    if (startDate) {
      body.dateQuery = {
        startDate,
        endDate: endDate || startDate, // Fallback to startDate if no range is selected
      };
    }

    const res = await fetch(`${BASE_URL}/manager/search-clock-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("SearchClockEvents Response:", data);
    return data;
  } catch (err) {
    console.error("❌ Search Clock Events Error:", err);
    return { 
      success: false, 
      message: "Network error while searching records", 
      clockEvents: [] 
    };
  }
};