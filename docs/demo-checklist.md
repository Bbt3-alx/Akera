# Akera MVP Demo Checklist

## Prerequisites

- Run the backend and frontend locally.
- Use the frontend only for the demo. Do not rely on Postman or direct MongoDB edits.
- Have separate manager and partner email accounts ready.
- Confirm email verification works in the local environment.

## Manager Flow

1. Sign up as the manager.
2. Verify the manager email.
3. Create a company.
4. Set the company exchange rate.
5. Set the manager transaction PIN.
6. Deposit company cash.
7. Invite a partner.

## Partner Flow

1. Sign up as the partner.
2. Verify the partner email.
3. Accept the company invitation.
4. Check the partner dashboard and partner balance.
5. Create a transaction.

## Payment Flow

1. Sign back in as the manager.
2. Check that the dashboard reflects the new pending transaction.
3. Open the transaction details.
4. Pay the transaction.
5. Download the receipt.
6. Verify that the dashboard updates after payment.

## Cancel Flow

1. Sign in as the partner.
2. Create another transaction.
3. Sign in as the manager.
4. Open the pending transaction.
5. Cancel the transaction.
6. Verify that the dashboard updates after cancellation.

## Reverse Flow

1. Open a completed transaction as the manager.
2. Reverse the completed transaction with the transaction PIN.
3. Verify that the dashboard updates after reversal.

## Dashboard Checks

- Manager dashboard shows company metrics, company cash, pending invitations, and accounting when available.
- Partner dashboard shows own transaction metrics and partner balance.
- Employee dashboard, if demoed, shows company transaction metrics without company cash or accounting unless the backend marks those sections visible.
- Recent transactions, status counts, and totals update after payment, cancellation, and reversal.

## Demo Rule

- Expected demo path is no Postman and no MongoDB. All actions should be completed through the frontend MVP flow.
