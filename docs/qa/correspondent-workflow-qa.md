# Correspondent Workflow Field QA

Use this checklist to manually validate the Abdoulaye / Kalil / Kadidia / Kallo correspondent workflow before field use. Run it in a non-production environment with the `correspondent_collections`, `transfers`, and `exchange_rate` modules enabled.

## Actors

- Abdoulaye: manager.
- Kalil: partner/correspondent with GNF membership.
- Kadidia: beneficiary who needs FCFA.
- Kallo: beneficiary who later withdraws GNF from Kalil.

## Setup

- [ ] Confirm Abdoulaye, Kalil, Kadidia, and Kallo test identities are available.
- [ ] Confirm Kalil is an active partner/correspondent in the company.
- [ ] Confirm Kalil's correspondent currency is `GNF`.
- [ ] Confirm the company uses the correspondent workflow for this scenario.
- [ ] Record the starting Kalil held balance, reserved balance, available balance, and `Company.balance`.

## Happy Path Scenario

1. Abdoulaye sets the current rate.
   - [ ] Rate is `82 000 GNF / 5 000 FCFA`.

2. Kalil logs in as partner.
   - [ ] Sidebar shows `Correspondants`.
   - [ ] Legacy `Transactions` is not the primary workflow for a correspondent-only company.

3. Kalil configures a transaction PIN if missing.
   - [ ] Missing PIN shows the setup CTA.
   - [ ] PIN setup succeeds.

4. Kalil creates a transaction for Kadidia.
   - [ ] Beneficiary name is `Kadidia`.
   - [ ] Received amount is `328 000 000 GNF`.
   - [ ] Computed payout is `20 000 000 FCFA`.
   - [ ] Rate, payout amount, payout currency, and base-rate fields are not editable.
   - [ ] Transaction code is visible and easy to copy.

5. Verify transaction status.
   - [ ] Status is `En attente de paiement`.
   - [ ] Message says `Fonds reçus par le correspondant, bénéficiaire pas encore payé.`

6. Verify Kalil balance immediately increases.
   - [ ] Held balance increased by `328 000 000 GNF`.
   - [ ] Reserved balance is unchanged.
   - [ ] `Company.balance` is unchanged.

7. Abdoulaye logs in as manager.
   - [ ] Dashboard uses correspondent metrics, not legacy transaction metrics.
   - [ ] Quick actions include `Payer par code`, `Faire un retrait`, `Voir transactions`, and `Voir retraits`.

8. Abdoulaye pays Kadidia by transaction code.
   - [ ] Pay-by-code lookup shows `Code transaction`, `Correspondant`, `Bénéficiaire`, `Montant à payer`, `Fonds détenus`, `Taux utilisé`, and `Statut`.
   - [ ] `Montant à payer` is the prominent amount: `20 000 000 FCFA`.
   - [ ] `Fonds détenus` is secondary: `328 000 000 GNF`.
   - [ ] Payment requires Abdoulaye's PIN.

9. Verify transaction status.
   - [ ] Status is `Payée`.
   - [ ] Message says `Bénéficiaire payé. Le solde du correspondant n’a pas été modifié à nouveau.`

10. Verify Kalil balance did not increase again.
    - [ ] Held balance is still increased only once by the original `328 000 000 GNF`.
    - [ ] `Company.balance` is unchanged.

11. Abdoulaye creates a retrait for Kallo.
    - [ ] Correspondent is Kalil.
    - [ ] Beneficiary name is `Kallo`.
    - [ ] Amount is `326 000 000 GNF`.
    - [ ] Devise is fixed to Kalil's correspondent currency.
    - [ ] Rate and counter amount fields are not shown in the default retrait form.

12. Verify Kalil reserved balance increases.
    - [ ] Reserved balance increases by `326 000 000 GNF`.
    - [ ] Available balance decreases by `326 000 000 GNF`.
    - [ ] `Company.balance` is unchanged.

13. Kalil confirms the retrait.
    - [ ] Partner button says `Confirmer le retrait`.
    - [ ] Confirmation requires Kalil's PIN.
    - [ ] Success message says `Retrait confirmé. Votre solde détenu pour l’entreprise a été diminué.`

14. Verify final Kalil balance.
    - [ ] Held balance is `2 000 000 GNF`.
    - [ ] Reserved balance returns to `0`.
    - [ ] `Company.balance` is unchanged.

## Negative Scenarios

- [ ] No rate configured: submit is disabled and shows `Aucun taux configuré. Contactez le manager avant de créer une transaction.`
- [ ] Invalid PIN: shows `PIN de transaction invalide.`
- [ ] Missing PIN: shows a transaction PIN setup CTA.
- [ ] FCFA partner tries to create transaction: shows `La création de transaction correspondant est disponible uniquement pour les correspondants en GNF pour le moment.`
- [ ] Wrong transaction code: shows `Code transaction introuvable.`
- [ ] Transaction already paid: no dangerous action is shown and the message says `Transaction déjà payée.`
- [ ] Transaction canceled: no dangerous action is shown and the message says `Transaction annulée. L’effet sur le solde correspondant a été reversé.`
- [ ] Insufficient correspondent balance for retrait: warning clearly states the available balance.
- [ ] Exact available balance retrait is allowed.
- [ ] Manager tries to confirm retrait: no confirmation action is shown.
- [ ] Another partner tries to view or confirm Kalil's retrait: access is denied with a friendly permission message.

## Terminology Checks

- [ ] Visible UI uses `Transaction`, `Transactions`, `Retrait`, `Retraits`, `Code transaction`, `Payer par code`, `Faire un retrait`, and `Confirmer le retrait`.
- [ ] Visible UI does not use `Collecte`, `Livraison`, `collection`, or `delivery`.
- [ ] Visible UI does not show raw field names such as `amount`, `currency`, `payoutAmount`, or `payoutCurrency`.
- [ ] Correspondent labels show names or emails, not raw membership IDs.

## Dashboard And Navigation Checks

- [ ] Manager dashboard shows `Fonds détenus par correspondants`, `Solde réservé`, `Transactions en attente`, `Transactions payées`, `Retraits en attente`, and `Retraits confirmés`.
- [ ] Partner dashboard shows `Mon solde détenu pour l’entreprise`, `Mes transactions en attente`, `Mes transactions payées`, `Mes retraits en attente`, and `Mes retraits confirmés`.
- [ ] Dashboard links deep-link to the correct Correspondants tabs.
- [ ] Correspondent-only sidebar hides legacy `Transactions`.
- [ ] `/app/transactions` says `Les transactions de cette société sont gérées dans le module Correspondants.`
- [ ] `/app/transactions` does not offer `New Transaction` for correspondent-only companies.

## Data Consistency Checks

- [ ] Transaction creation increments Kalil's held balance immediately.
- [ ] Pay-by-code does not increment Kalil's held balance again.
- [ ] Pending transaction cancellation reverses the balance and ledger effect.
- [ ] Retrait creation increments reserved balance.
- [ ] Retrait confirmation decrements held balance and reserved balance.
- [ ] Retrait cancellation decrements reserved balance.
- [ ] `Company.balance` is not mutated by transaction creation, payment, retrait creation, retrait confirmation, or retrait cancellation.
