/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState } from "react";

import { getCurrentUser, loginUser, registerUser } from "../api/authApi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the existing session when the application starts.
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("sweety_token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        // An invalid or expired token cannot restore a session.
        console.error("Session restore failed:", error);
        localStorage.removeItem("sweety_token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "sweety_token" && !event.newValue) {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials);

    const { token, user: authenticatedUser } = response.data;

    localStorage.setItem("sweety_token", token);
    setUser(authenticatedUser);

    return authenticatedUser;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await registerUser(userData);

    const { token, user: registeredUser } = response.data;

    localStorage.setItem("sweety_token", token);
    setUser(registeredUser);

    return registeredUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sweety_token");
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
