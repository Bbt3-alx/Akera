import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div>
      <h1>Dashboard Akera</h1>
      <p>Bienvenue, {user?.name}!</p>

      <button onClick={logout}>Se déconnecter</button>
    </div>
  );
}

export default Dashboard;
