import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as LocalAuthentication from "expo-local-authentication";
import {
  adminApi,
  getToken,
  setToken,
  removeToken,
} from "../services/adminApi";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBiometricAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadStoredAuth();
  }, []);

  async function checkBiometricAvailability() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(compatible && enrolled);
  }

  async function authenticateWithBiometric(): Promise<boolean> {
    if (!isBiometricAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access Gradus Admin",
        fallbackLabel: "Use password",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.log("Biometric auth error:", error);
      return false;
    }
  }

  async function loadStoredAuth() {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        // Token exists, try to authenticate with biometric first
        if (isBiometricAvailable) {
          const biometricSuccess = await authenticateWithBiometric();
          if (!biometricSuccess) {
            // Biometric failed, but we still have token - proceed anyway
            // User chose to cancel, they can retry
          }
        }

        setTokenState(storedToken);
        try {
          const { admin: profile } = await adminApi.getProfile();
          setAdmin(profile);
        } catch {
          // Token might be expired, clear it
          await removeToken();
          setTokenState(null);
        }
      }
    } catch (error) {
      console.log("Auth load failed:", error);
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { token: newToken, admin: adminData } = await adminApi.login(
      email,
      password
    );
    await setToken(newToken);
    setTokenState(newToken);
    setAdmin(adminData);
  }

  async function logout() {
    await removeToken();
    setTokenState(null);
    setAdmin(null);
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isAuthenticated: !!token && !!admin,
        isBiometricAvailable,
        login,
        logout,
        authenticateWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
