# Tule Resort — Staff & Management Access Guide

## Overview
This document contains the official staff accounts, initial default onboarding passwords, and the procedure for staff to log in and set their own personal password.

---

## 1. Login Portal
- **Login URL:** `https://your-domain.com/staff/login` (or `http://localhost:3000/staff/login` locally)
- **Default Onboarding Password for all accounts:**
  ```text
  TuleResort2026!
  ```

---

## 2. Staff Accounts Directory

| Role / Department | Full Name | Email Address | Initial Default Password |
| :--- | :--- | :--- | :--- |
| **Owner / Super Admin** | Yishak Tule | `yishakhak@gmail.com` | `TuleResort2026!` |
| **Resort Administrator** | Resort Administrator | `admin@tuleresort.com` | `TuleResort2026!` |
| **General Manager** | General Manager | `manager@tuleresort.com` | `TuleResort2026!` |
| **Restaurant & Dining** | Dining Lead | `restaurant@tuleresort.com` | `TuleResort2026!` |
| **Front Desk & Reservations** | Front Desk Lead | `frontdesk@tuleresort.com` | `TuleResort2026!` |
| **Spa & Wellness** | Wellness Lead | `spa@tuleresort.com` | `TuleResort2026!` |
| **Housekeeping** | Housekeeping Lead | `housekeeping@tuleresort.com` | `TuleResort2026!` |

---

## 3. How Staff Members Set Their Own Password
1. Visit `/staff/login`.
2. Enter your assigned **Email Address** and the default password: **`TuleResort2026!`**.
3. Click **Sign in**.
4. Once inside the Dashboard:
   - Click the **"Set My Personal Password"** banner or the **"Change Password"** button in the top navigation bar.
   - Enter your **New Personal Password** (minimum 6 characters).
   - Confirm and click **Update Password**.
5. From that point forward, only the staff member's new personal password will be accepted for login.

---

## 4. Resetting Passwords (For Administrators)
If a staff member forgets their password in the future:
1. **Via the Admin Staff Management UI:**
   - Log in as Admin and navigate to `/admin/staff`.
   - Find the staff member and click **Reset Password**.
2. **Via Supabase Dashboard:**
   - Open your project at [app.supabase.com](https://app.supabase.com).
   - Go to **Authentication** → **Users**.
   - Click the three dots `...` next to the user and choose **Send password reset** or update their password.
