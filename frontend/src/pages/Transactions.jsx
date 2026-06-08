import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

function Transaction() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [partnerId, setPartnerId] = useState("");

  // Charger les transaction
  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const data = await apiRequest("/api/v1/transactions");
      setTransactions(data.transactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Creer une transaction
  async function handleSubmit(e) {
    e.preventDefault();

    if (!amount || !description || !partnerId) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const data = await apiRequest("/api/v1/transactions/new", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          description,
          partnerId,
        }),
      });
      const partners = await apiRequest("/api/v1/partners/");
      console.log("Liste des partenaires:", partners);

      // Ajouter la nouvelle transaction en haut de la liste
      setTransactions((prev) => [data.transaction, ...prev]);

      // Reset formulaire
      setAmount("");
      setDescription("");
      setPartnerId("");
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div>Chargement des transactions...</div>;
  }

  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h1>Transactions</h1>

      {/* Formulaire de création de transaction */}
      <h3>Nouvelle transaction</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Montant"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          onSubmit={handleSubmit}
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          onSubmit={handleSubmit}
          type="text"
          placeholder="ID du partenaire"
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        />
        <button type="submit">Créer</button>
      </form>

      {/* Liste des transactions */}
      <table border="1" cellPadding="8" cellSpacing="0">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Montant</th>
            <th>Status</th>
            <th>Compte</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx._id}>
              <td>{tx.code}</td>
              <td>{tx.description}</td>
              <td>{tx.amount}</td>
              <td>{tx.status}</td>
              <td>{tx.partner}</td>
              <td>{new Date(tx.date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default Transaction;
