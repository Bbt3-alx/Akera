import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  return (
    <div>
      <h2>Connexion</h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          console.log("Identifier:", identifier);
          console.log("Password:", password);

          try {
            const response = await fetch(
              "https://akera.onrender.com/api/v1/auth/login",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: identifier, // assuming identifier is email
                  password: password,
                }),
              }
            );
            const data = await response.json();
            console.log("API response:", data);

            if (!response.ok) {
              alert(data.message || "Echec de connexion");
              return;
            }

            // Sauvegarder le token dans le stockage local
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/dashboard");
            alert("Connexion reussi !");
          } catch (erreur) {
            console.log("Erreur reseaux: ", erreur);
          }
        }}
      >
        <input
          type="text"
          placeholder="Email ou téléphone"
          value={identifier}
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
        <button type="submit">Se connecter</button>
      </form>
      <br />
    </div>
  );
}

export default Login;
