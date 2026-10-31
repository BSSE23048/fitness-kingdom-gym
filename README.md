# Fitness Kingdom Gym — Member and Payment Portal

A React/Firebase application for one gym to manage members, admission/monthly payments, attendance, expenses and trainer payroll.

## Status

This branch replaces open database rules with trusted owner-claim authorization. It requires administrator provisioning before deployment. It is not a multi-tenant SaaS or a zero-defect system.

## Stack

React 18, JavaScript, Vite, Firebase Authentication/Firestore, Tailwind CSS and Recharts.

## Setup and checks

Use Node.js 22. The Firebase CLI emulator command also requires Java 21.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows, use `Copy-Item .env.example .env.local`. Configure a separate Firebase test project with synthetic member/payment records. Read [owner-access setup](docs/OWNER-ACCESS.md) before using any privileged workflow.

```sh
npm run test:rules:ci
npm run build
```

## Main workflows

- Member registration, membership status, renewal and freeze/unfreeze.
- Separate admission and recurring monthly fee workflows.
- Payment records, expenses, attendance, trainer payroll and CSV exports.
- Owner profile/password settings and WhatsApp reminder links.

These are implementation areas, not a claim that every edge case has passed a live acceptance test. WhatsApp links prepare messages; they do not send automated reminders.

## Authorization

Firestore permits access only to users with a trusted boolean `owner` custom claim. A stored profile role, email address, cached browser value or confirmation PIN does not authorize database operations. Owner provisioning must use trusted Admin SDK credentials outside the repository.

The client-side PIN remains a confirmation convenience, not an additional security factor. Existing service functions can suppress persistence errors; a follow-up should ensure failed writes cannot appear successful.

## Portfolio demo

Use synthetic records to demonstrate registration, an admission payment, a monthly payment, attendance and a CSV export. Then show anonymous/non-owner database access being rejected. Capture mobile and desktop screenshots only after exercising the actual workflow; no screenshots are supplied here.

## Contribution and use

Repository maintainer: [Agha Shoaib Zaib](https://github.com/BSSE23048). This is business-specific software; keep real member, payment and identity information out of demos and source control.

Custom built for Fitness Kingdom Gym. All rights reserved.
