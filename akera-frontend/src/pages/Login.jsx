import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function Login() {
  const [email, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  return (
    <div>
      <h2>Connexion</h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();

          try {
            const data = await apiRequest("/api/v1/auth/login", {
              method: "POST",
              body: JSON.stringify({
                email, // assuming identifier is email
                password,
                role,
              }),
            });

            // Sauvegarder le token dans le stockage local
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            navigate("/dashboard");
          } catch (erreur) {
            console.log("Erreur reseaux: ", erreur);
          }
        }}
      >
        <input
          type="text"
          placeholder="Email ou téléphone"
          value={email}
          onChange={(e) => {
            setIdentifier(e.target.value);
          }}
        />
        <br />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <br />
        <input
          type="text"
          placeholder="Rôles (ex: user, admin)"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
          }}
        />
        <button type="submit">Se connecter</button>
      </form>
      <br />
    </div>
  );
}

export default Login;
