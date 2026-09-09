# Fitness Kingdom Gym — Management Portal & Executive ERP

![Fitness Kingdom Gym ERP](https://img.shields.io/badge/Fitness%20Kingdom-Management%20Portal-emerald?style=for-the-badge&logo=react)
![Firebase Spark Safe](https://img.shields.io/badge/Firebase-Spark%20Plan%20Safe-amber?style=for-the-badge&logo=firebase)
![Dual Owner Security](https://img.shields.io/badge/Security-Dual%20Owner%20PIN%201234-blue?style=for-the-badge&logo=firebase)
![Mobile First](https://img.shields.io/badge/Mobile--First-Responsive-purple?style=for-the-badge&logo=tailwindcss)

A production-grade, zero-defect **Executive Management Portal & Member CRM System** custom-architected for **Fitness Kingdom Gym**. Runs 100% on the client-side with zero external API fees or backend server costs (Firebase Spark Tier safe).

- **Production Live URL**: [https://fitness-kingdom-gym.web.app](https://fitness-kingdom-gym.web.app)

---

## 🏛️ Dual-Owner Multi-Tenant Architecture & Security

The system is secured by Firebase Authentication with dynamic profile resolution for the dual-owner executive team:

- **Owner 1**: `ahmad@fitnesskingdom.com` → Display Name: **Ahmad** (`Role: OWNER`)
- **Owner 2**: `mohsin@fitnesskingdom.com` → Display Name: **Mohsin** (`Role: OWNER`)

### 🔑 Security & Authorization Controls
1. **Instant Session Hydration**: Owner display names and security tokens are cached locally for sub-second page loads without full-screen spinners.
2. **Owner Security PIN (`1234`)**: Sensitive operations (deleting members, voiding payments, rolling back transactions, deleting expenses, removing trainers) strictly require security PIN `1234` verification via `PinConfirmModal`.
3. **Owner Profile & Password Updates**: Owners can update their display name and login password inside **Gym Plans & Settings** with mandatory `reauthenticateWithCredential` security verification.

---

## 📋 Comprehensive Operational Workflow Manual

### Step 1: Client Registration & Member CRM Onboarding
1. Navigate to **Member CRM** (`/members`) and click **Add New Member**.
2. **Strict Validations Enforced**:
   - **Pakistani Phone Number**: Must start with country code `92` followed by 10 digits (e.g. `923001234567`). Auto-sanitizes spaces, dashes, or leading zeros (`0300...` → `92300...`).
   - **13-Digit CNIC / National ID**: Must be exactly 13 numeric digits without hyphens (e.g. `3520112345671`).
3. **Sequential Member ID**: Generates an atomic sequential ID (`FK-001`, `FK-002`, `FK-003`...).
4. **Decoupled Billing Setup**: Member profiles are registered without creating ghost monthly dues. Admission fees (Rs. 2,000 default) can be collected or marked as **Waive Off**.

### Step 2: One-Time Admission Fee Collection
1. Navigate to **Fee Collection Module** → **Tab 2: One-Time Registration / Admission Fees**.
2. Unpaid non-waived admission fees queue under pending admission dues.
3. Click **Collect Admission Fee**, select payment method (Cash / Bank Transfer), and record payment.
4. Generates a deterministic document key (`admission_${memberId}`) in Firestore.

### Step 3: Recurring Monthly Membership Fees & Defaulters
1. Navigate to **Fee Collection Module** → **Tab 1: Recurring Monthly Membership Fees**.
2. Select the target billing month (e.g., **September 2026**).
3. **Billing Logic**:
   - Members on 1-month plans show as **UNPAID / DEFAULTER ⚠️** on the 1st of each month.
   - Members on advance 3-month deals automatically show as **PAID (Covered under 3-Month Plan)** for their duration.
   - Members with frozen subscriptions show as **FROZEN ❄️** (billing paused).
4. Click **Collect Fee** to record payment. Generates a deterministic document key (`monthly_${memberId}_${selectedMonth}`) to prevent duplicate billing.

### Step 4: WhatsApp Automated Fee Follow-Up (Zero-Cost `wa.me`)
1. In **Fee Collection**, click the **WhatsApp button** next to any unpaid member.
2. Generates an instant WhatsApp deep link (`https://wa.me/923001234567?text=...`) with pre-filled English reminder text:
   > *"Dear [Member Name], this is a formal reminder from Fitness Kingdom Gym that your membership dues of Rs. [Amount] for the month of [Month] are currently pending. Kindly clear your dues at the reception counter. Thank you!"*

### Step 5: Gym Cashflow, Expenses & Trainer Payroll
1. Navigate to **Financials & Expenses** (`/financials`).
2. **Strict Cash Basis Ledger**:
   - **Total Revenue**: Sum of actual confirmed payments in Firestore for the selected month (Recurring Fees + Admission Fees). Zero ghost revenue from unpaid members.
   - **Operational Expenses**: Record rent, electricity, equipment maintenance under `expenses`.
   - **Trainer Payroll**: Calculated dynamically (`Base Salary + Commission - Deductions`) from active PT clients.
   - **Net Cashflow**: `Total Collected Revenue - (Expenses + Paid Payroll)`.

### Step 6: Reception Attendance & One-Click CSV Exports
1. Navigate to **Daily Attendance** (`/attendance`) for paper-desk sync check-ins.
2. Click **Export CSV** on any module to download client-side spreadsheets:
   - **Fee Dues Export**: `Fee_Dues_[Month].csv`
   - **Members Directory Export**: `Active_Members_List.csv`
   - **Expenses Ledger Export**: `Gym_Expenses_[Month].csv`

---

## ⚡ Technical Architecture & Offline Resilience

- **Offline-First Storage**: Configured with `initializeFirestore` using `persistentLocalCache` and `persistentMultipleTabManager` for uninterrupted reception operation during internet outages.
- **Dynamic Code Splitting**: Heavy page routes (`Dashboard`, `Members`, `FeeCollection`, `Financials`) use `React.lazy()` wrapped in `<Suspense fallback={<PageSkeletonLoader />}>`.
- **Vendor Chunk Optimization**: `vite.config.js` splits vendor bundles (`firebase-vendor`, `charts-vendor`, `ui-vendor`) to maintain individual chunks under 300kb.
- **Mobile-First UX**: Responsive shell converts to a left slide-out drawer on mobile (<1024px). Data tables transform into touch-friendly cards on phone screens.

---

## 🚀 Deployment & Maintenance

### Build & Deploy to Firebase Hosting
```bash
# 1. Install dependencies
npm install

# 2. Test production build
npm run build

# 3. Deploy to Firebase Cloud Hosting
firebase deploy
```

---

## 📄 License
Custom built for **Fitness Kingdom Gym**. All rights reserved.
