# El Elyon | Professional Loan Management System

El Elyon is a robust, modern fintech application designed for micro-lending institutions to manage their loan portfolios, client relationships, and financial transactions with precision and transparency.

![El Elyon Banner](https://github.com/user-attachments/assets/your-placeholder-banner)

## 🚀 Overview

El Elyon (Credit & Capital Solutions) provides a comprehensive platform for lenders to track the entire lifecycle of a loan—from disbursement to final repayment. The system features a self-healing transaction ledger, automated penalty calculations, and professional-grade financial reporting.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Postgres, Auth, Storage)
- **Icons**: [Lucide React](https://lucide.dev/)
- **UI Components**: Custom-built premium components with a focus on fintech aesthetics.

## ✨ Key Features

### 🏦 Loan Management
- **Full Lifecycle Tracking**: Manage loans through states: `Pending`, `Active`, `Overdue`, and `Completed`.
- **Flexible Interest Models**: Supports Flat and Reducing Balance interest types.
- **Automated Overdue Flagging**: System automatically detects and flags loans that have passed their due date without full repayment.

### 👥 Client & Borrower Portal
- **Centralized Profiles**: Store comprehensive borrower information including National ID, contact details, and employment info.
- **Guarantor & Security Tracking**: Record collateral and guarantor details for secured lending.

### 💸 Financial Engine
- **Transaction Ledger**: A chronological, double-entry style ledger that combines disbursements, repayments, and penalties into a single "Source of Truth" for each loan.
- **Repayment Processing**: Record payments via various methods (Cash, M-Pesa, Bank Transfer) with support for backdated entries.
- **Penalty Register**: Accrue and track penalties for late payments, with the ability to reverse charges when necessary.

### 📄 Professional Reporting
- **Loan Statements**: Generate high-fidelity, print-ready statements for clients.
- **Export to PDF**: Integrated print controls for saving digital records.
- **Audit Logging**: Comprehensive tracking of all administrative actions for compliance and troubleshooting.

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (Pages and Layouts)
│   ├── (auth)/           # Authentication routes (Login, Reset Password)
│   ├── (root)/           # Core application routes (Dashboard, Loans, Clients)
│   └── globals.css       # Global styles and Tailwind 4 design system
├── components/           # Reusable UI components
├── lib/
│   ├── actions/          # Modular Server Actions (Supabase Logic)
│   │   ├── loan.actions.ts
│   │   ├── client.actions.ts
│   │   └── repayment.actions.ts
│   ├── supabase.ts       # Supabase client configurations
│   └── utils.ts          # Financial formatting and helper functions
├── public/               # Static assets (Icons, Logos)
└── types/                # Global TypeScript interfaces
```

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+ 
- A Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/elelyon-supabase.git
   cd elelyon-supabase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔒 Security

El Elyon utilizes Supabase Row Level Security (RLS) and SSR-based authentication to ensure that sensitive financial data is only accessible to authorized staff. All password resets and sensitive account changes are handled via secure, tokenized email flows.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built for El Elyon Credit & Capital Solutions.*
