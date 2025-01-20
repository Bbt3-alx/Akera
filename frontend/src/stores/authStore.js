import { create } from "zustand"; // Zustand for state management
import axios from "axios";

// Setting axios to send cookies with requests by default
axios.defaults.withCredentials = true;

console.log("Current mode:", import.meta.env.MODE);
const API_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000/api/auth"
    : "/api/auth";

// Creating a Zustand store to manage authentication state
export const useAuthStore = create((set) => ({
  // Initial state of the store
  user: null,
  message: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isCheckingAuth: true,

  // Function to handle user signup
  signup: async (email, password, name) => {
    // Start loading and reset any previous errors
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        name,
      });

      // Update the store with the new user data if signup is successful
      set({
        user: response.data.user, // Save the user data
        isAuthenticated: true, // Mark as authenticated
        isLoading: false, // Stop loading
      });
    } catch (error) {
      // Handle errors and stop loading
      set({
        error: error.response.data.message || "Error during sign up.",
        isLoading: false,
      });
      throw error; // Rethrow the error to be handled elsewhere if needed
    }
  },

  // Function to handle user login
  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      // Update the store with the logged-in user data
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error.response.data.message || "Error during login.",
        isLoading: false,
      });
      throw error;
    }
  },

  // Function to verify the email address
  verifyEmail: async (code) => {
    // Start loading and reset any previous errors
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/verify-email`, { code });

      // Update the store with the user data after verification
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return response.data; // Return the response data
    } catch (error) {
      set({
        error: error.response.data.message || "Error verifying email",
        isLoading: false,
      });
      throw error;
    }
  },

  // Function to check if the user is already authenticated
  checkAuth: async () => {
    // Start checking authentication status
    set({ isCheckingAuth: true, error: null });

    try {
      const response = await axios.get(`${API_URL}/verify-auth`);

      set({
        user: response.data.user,
        isAuthenticated: true,
        isCheckingAuth: false,
      });
    } catch (error) {
      console.log(error);
      set({
        error: null, // No error message in this case
        isCheckingAuth: false,
      });
    }
  },

  // Function to send a password reset email
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/forgot-password`, {
        email,
      });

      set({ message: response.data.message, isLoading: false });
    } catch (error) {
      set({
        error: error.response.data.message || "Error sending reset email",
        isLoading: false,
      });
      throw error;
    }
  },

  // Function to reset the user's password
  resetPassword: async (token, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/reset-password/${token}`, {
        password,
      });

      // Set the success message after password reset
      set({ message: response.data.message, isLoading: false });
    } catch (error) {
      set({
        error: error.response.data.message || "Error resetting password",
        isLoading: false,
      });
      throw error;
    }
  },
}));
