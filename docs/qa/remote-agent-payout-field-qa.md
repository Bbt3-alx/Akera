# Remote Agent Payout Field QA

Use this checklist to manually validate the Adama remote agent payout workflow before field use. Run it in a non-production environment with the `remote_agent_payout`, `account_operations`, and `company_cash` modules enabled.

## Actors

- Adama: manager
- Mamadou: employee agent with `remote_payout:view`, `remote_payout:deposit`, `remote_payout:pay`
- Oumar: employee agent with `remote_payout:view`, `remote_payout:pay`
- Kallo: employee agent with `remote_payout:view`

## Setup

- [ ] Create or select the active company for Adama.
- [ ] Confirm Adama, Mamadou, Oumar, and Kallo are active memberships in the same company.
- [ ] Confirm all four users can sign in.
- [ ] Confirm the company base currency and Remote Agent Payout workflow use FCFA.

## Scenario

1. Adama creates the group `Agents Bamako`.
   - [ ] Group appears in `Paiements agents > Groupes d'agents`.
   - [ ] Group balance, reserved balance, and available balance start at `0 FCFA`.

2. Adama adds members to `Agents Bamako`.
   - [ ] Mamadou has `Voir`, `Depot`, and `Paiement`.
   - [ ] Oumar has `Voir` and `Paiement`.
   - [ ] Kallo has `Voir` only.
   - [ ] Member names show full names, not membership IDs.

3. Mamadou configures a transaction PIN.
   - [ ] PIN setup succeeds from the Transaction PIN page or inline prompt.
   - [ ] Remote Agent Payout no longer blocks Mamadou for missing PIN.

4. Oumar configures a transaction PIN.
   - [ ] PIN setup succeeds.
   - [ ] Oumar can access the payment-by-code area.

5. Mamadou records a deposit of `1 000 000 FCFA`.
   - [ ] Deposit form accepts `1 000 000` and stores `1000000`.
   - [ ] Decimal amounts such as `1000000.50` are rejected.
   - [ ] Success message confirms the deposit.

6. Adama checks the group balance.
   - [ ] Group balance is `1 000 000 FCFA`.
   - [ ] Reserved balance is `0 FCFA`.
   - [ ] Available balance is `1 000 000 FCFA`.
   - [ ] Company balance is not changed by the remote agent deposit.

7. Adama creates a payout of `300 000 FCFA`.
   - [ ] Payout uses `Agents Bamako`.
   - [ ] Beneficiary name is visible.
   - [ ] Beneficiary code is shown once after creation.
   - [ ] Copy button works.
   - [ ] After Adama confirms sharing, the raw code is no longer visible.
   - [ ] Group reserved balance becomes `300 000 FCFA`.
   - [ ] Group available balance becomes `700 000 FCFA`.

8. Oumar looks up the beneficiary code.
   - [ ] Lookup succeeds with the one-time code.
   - [ ] Oumar sees beneficiary name, amount, payout reference, and group.
   - [ ] Raw beneficiary hash or internal IDs are not visible.

9. Oumar pays the beneficiary with transaction PIN.
   - [ ] Payment requires Oumar's PIN.
   - [ ] Payment succeeds once.
   - [ ] Repeating the same payment does not debit group balances twice.
   - [ ] Group balance becomes `700 000 FCFA`.
   - [ ] Reserved balance returns to `0 FCFA`.

10. Kallo tries to pay.
    - [ ] Kallo has no payment action enabled.
    - [ ] If Kallo tries to use a beneficiary code directly, the UI shows a generic invalid/expired code message.
    - [ ] Kallo does not learn whether a pending payout exists.

## Operations Page Checks

- [ ] The operations page is available at `/app/operations`.
- [ ] It shows `Depot agent` with actor Mamadou.
- [ ] It shows `Paiement cree` with actor Adama.
- [ ] It shows `Paiement paye` with actor Oumar.
- [ ] The `Acteur` column shows full names first and email only as fallback.
- [ ] Group is shown as `Agents Bamako`.
- [ ] References are payout/deposit references, not raw database IDs.
- [ ] No beneficiary code, beneficiary hash, transaction PIN, idempotency key, audit metadata, or ledger internals are visible.

## Dashboard Checks

- [ ] Adama sees the Remote Agent Dashboard, not the legacy transfer dashboard.
- [ ] Adama sees group cash metrics, active groups, recent operations, and quick actions.
- [ ] Mamadou sees PIN state, active groups, permissions, today's own deposit amount, and authorized recent operations.
- [ ] Oumar sees today's own paid amount after payment.
- [ ] Kallo sees view-only permissions and no payment/deposit action.
- [ ] Agent dashboards do not list all pending beneficiaries.

## Error Message Checks

- [ ] Missing PIN: clear French prompt to configure the transaction PIN.
- [ ] Invalid PIN: clear French invalid PIN message.
- [ ] Invalid or expired beneficiary code: generic French message.
- [ ] No deposit permission: clear French permission message.
- [ ] No pay permission: no payment controls; generic code message if lookup is attempted.
- [ ] No active group: clear French empty state.
- [ ] Insufficient group balance: clear French balance message.
- [ ] Member already in group: clear French duplicate member message.
- [ ] Inactive group: clear French active-group message.
- [ ] Payout already paid or canceled: clear French status message.

## Data Consistency Checks

- [ ] FCFA amounts are integer-only in backend and frontend.
- [ ] Remote agent deposit increments `RemoteAgentGroup.balance`.
- [ ] Remote agent deposit does not mutate `Company.balance`.
- [ ] Payout creation increments `RemoteAgentGroup.reservedBalance`.
- [ ] Payout payment decrements `RemoteAgentGroup.balance` and `RemoteAgentGroup.reservedBalance` once.
- [ ] Payout cancellation decrements `RemoteAgentGroup.reservedBalance` once.
- [ ] `RemoteAgentGroup.balance` and `reservedBalance` never become negative.
- [ ] Payment remains beneficiary-code based; operations rows do not expose a pay button.
- [ ] Dashboard data comes from RemoteAgentGroup, RemoteAgentPayout, and operations data, not legacy Transaction data.

## Demo Data

No seed script is required for this checklist. If a demo dataset is needed, create it manually through the UI so transaction PIN, one-time beneficiary code, permissions, and actor attribution are validated exactly as field users will use them.
