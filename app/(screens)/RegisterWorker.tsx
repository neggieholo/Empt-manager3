import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PhoneInput from "react-native-phone-number-input";
import { registerWorker } from "../services/api";

export default function RegisterWorkerAlert() {
  const router = useRouter();
  const phoneInput = useRef<PhoneInput>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    formattedValue: "",
    gender: "male",
    department: "",
    password: "", // Now empty for manual typing
  });

  const selectGender = () => {
    Alert.alert("Select Gender", "Choose worker's gender:", [
      { text: "Male", onPress: () => setForm({ ...form, gender: "male" }) },
      { text: "Female", onPress: () => setForm({ ...form, gender: "female" }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRegister = async () => {
    // 1. Manual Phone Cleaning
    let cleaned = form.phoneNumber.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);

    // 2. Local UI Validation
    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.department ||
      !form.password
    ) {
      return Alert.alert(
        "Error",
        "Please fill in all fields, including password",
      );
    }

    if (cleaned.length !== 10) {
      return Alert.alert(
        "Error",
        "Phone number must be exactly 10 digits (e.g. 8117489145)",
      );
    }

    if (form.password.length <= 8) {
      return Alert.alert(
        "Weak Password",
        "The password must be more than 8 characters long for security.",
      );
    }

    const finalPhone = `+234${cleaned}`;

    setLoading(true);

    try {
      // 3. Call the external API function
      await registerWorker({
        ...form,
        role: "worker",
        phoneNumber: finalPhone,
      });

      // 4. Success UI
      Alert.alert("Success", "Worker registered successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      // 5. Error UI (Catches the "throw" from the API function or network failures)
      const errorMessage =
        error.message === "Failed to fetch"
          ? "Could not reach server. Check your aapanel status."
          : error.message;

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      {/* Name Fields */}
      <View className="flex-row justify-between mb-4">
        <TextInput
          placeholder="First Name"
          className="bg-gray-100 p-4 rounded-xl w-[48%]"
          onChangeText={(v) => setForm({ ...form, firstName: v })}
        />
        <TextInput
          placeholder="Last Name"
          className="bg-gray-100 p-4 rounded-xl w-[48%]"
          onChangeText={(v) => setForm({ ...form, lastName: v })}
        />
      </View>

      <TextInput
        placeholder="Email Address"
        autoCapitalize="none"
        keyboardType="email-address"
        className="bg-gray-100 p-4 rounded-xl mb-4"
        onChangeText={(v) => setForm({ ...form, email: v })}
      />

      <Text className="text-gray-500 mb-2 ml-1">Phone Number (Omit 0)</Text>
      <PhoneInput
        ref={phoneInput}
        defaultValue={form.phoneNumber}
        defaultCode="NG"
        onChangeText={(t) => setForm({ ...form, phoneNumber: t })}
        containerStyle={{
          width: "100%",
          backgroundColor: "#f3f4f6",
          borderRadius: 12,
          marginBottom: 16,
        }}
        textContainerStyle={{ backgroundColor: "transparent" }}
        countryPickerProps={{
          withSafeAreaView: true,
          modalProps: { presentationStyle: "pageSheet" },
          flatListProps: {
            ListHeaderComponent: <View style={{ height: 40 }} />,
          },
        }}
      />

      <View className="flex-row justify-between mb-4">
        <View className="w-[48%]">
          <Text className="text-gray-500 mb-2 ml-1">Gender</Text>
          <TouchableOpacity
            onPress={selectGender}
            className="bg-gray-100 p-4 rounded-xl"
          >
            <Text className="text-black capitalize">{form.gender}</Text>
          </TouchableOpacity>
        </View>
        <View className="w-[48%]">
          <Text className="text-gray-500 mb-2 ml-1">Department</Text>
          <TextInput
            placeholder="e.g. IT"
            className="bg-gray-100 p-4 rounded-xl"
            onChangeText={(v) => setForm({ ...form, department: v })}
          />
        </View>
      </View>

      {/* MANUAL PASSWORD INPUT */}
      <Text className="text-gray-500 mb-2 ml-1">Set Worker Password</Text>
      <View className="bg-gray-100 rounded-xl mb-8 flex-row items-center pr-4">
        <TextInput
          placeholder="Must be > 8 characters"
          secureTextEntry={!showPassword}
          className={`p-4 flex-1 ${form.password.length > 0 && form.password.length <= 8 ? "text-red-500" : "text-black"}`}
          onChangeText={(v) => setForm({ ...form, password: v })}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        className={`p-4 rounded-2xl items-center ${loading ? "bg-gray-400" : "bg-[#36AA8F]"}`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Register Worker</Text>
        )}
      </TouchableOpacity>

      <View className="h-20" />
    </ScrollView>
  );
}
