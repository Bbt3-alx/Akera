import { useState } from "react";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h2>Connexion</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log("Identifier:", identifier);
          console.log("Password:", password);
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
