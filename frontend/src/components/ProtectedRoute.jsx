import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    // Pas connecté → retour login
    return <Navigate to="/" replace />;
  }

  // Connecté → accès autorisé
  return children;
}

export default ProtectedRoute;
