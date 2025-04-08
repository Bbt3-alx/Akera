import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import FloatingShape from "./components/FloatingShape.jsx";
import SignUp from "./pages/SignUp.jsx";
import Login from "./pages/Login.jsx";
import EmailVerification from "./pages/EmailVerification.jsx";
import { useAuthStore } from "./stores/authStore.js";
import { useEffect } from "react";
import Overview from "./pages/Overview.jsx";
import Loading from "./components/Loading.jsx";
import ResetPassword from "./pages/ResetPwd.jsx";
import ForgotPassword from "./pages/ForgotPwd.jsx";
import OperationPage from "./pages/OperationPage.jsx";
import SideBar from "./components/SideBar.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // if (isAuthenticated && !user._doc.isVerified) {
  //   return <Navigate to="/verify-email" replace />;
  // }

  return children;
};

const RedirectAuthenticatedUser = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  // Safeguard for null user
  if (isAuthenticated && user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <Loading />;
  }

  return (
    // <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 flex items-center justify-center relative overflow-hidden">
    //   <FloatingShape
    //     color="bg-indigo-500"
    //     size="w-64 h-64"
    //     top="-5%"
    //     left="10%"
    //     delay={0}
    //   />
    //   <FloatingShape
    //     color="bg-purple-500"
    //     size="w-48 h-48"
    //     top="70%"
    //     left="80%"
    //     delay={5}
    //   />
    //   <FloatingShape
    //     color="bg-blue-500"
    //     size="w-32 h-32"
    //     top="40%"
    //     left="-10%"
    //     delay={2}
    //   />
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden ">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <ProtectedRoute>
        <SideBar />
      </ProtectedRoute>

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Overview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedRoute>
              <OperationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectAuthenticatedUser>
              <SignUp />
            </RedirectAuthenticatedUser>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectAuthenticatedUser>
              <Login />
            </RedirectAuthenticatedUser>
          }
        />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route
          path="/forgot-password"
          element={
            <RedirectAuthenticatedUser>
              <ForgotPassword />
            </RedirectAuthenticatedUser>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <RedirectAuthenticatedUser>
              <ResetPassword />
            </RedirectAuthenticatedUser>
          }
        />
        <Route path="*" element={<Navigate to={"/"} replace />} />
      </Routes>
      <Toaster />
    </div>
  );
}

export default App;
