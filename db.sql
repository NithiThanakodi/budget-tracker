-- 1. Create Custom Types for Intervals
CREATE TYPE expense_interval AS ENUM ('monthly', 'bi-monthly', 'quarterly', 'specific_months');

-- 2. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INT DEFAULT 0
);

-- 3. Expense Templates (The "Rules")
CREATE TABLE expense_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    item_name TEXT NOT NULL,
    default_amount DECIMAL(12,2) DEFAULT 0,
    interval_type expense_interval DEFAULT 'monthly',
    specific_months INT[] DEFAULT '{}', -- e.g., {5, 9, 12} for School Fees
    is_active BOOLEAN DEFAULT true
);

-- 4. Monthly Budget Entries (The Actual Grid)
CREATE TABLE budget_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES expense_templates(id),
    month_year DATE NOT NULL, -- Always use first of the month: 2026-03-01
    planned_amount DECIMAL(12,2),
    actual_amount DECIMAL(12,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    UNIQUE(template_id, month_year)
);

-- 5. Jewel Loans Table
CREATE TABLE jewel_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_name TEXT NOT NULL, -- IOB, Indian Bank, Victoria Nagar
    loan_type TEXT CHECK (loan_type IN ('bank', 'pawn')),
    item_details TEXT,
    grams DECIMAL(10,2),
    loan_amount DECIMAL(12,2),
    interest_rate DECIMAL(5,2),
    loan_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'active' -- active, recovered
);

-- 6. Income Table
CREATE TABLE income_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year DATE NOT NULL,
    salary_amount DECIMAL(12,2) DEFAULT 50000,
    other_income DECIMAL(12,2) DEFAULT 20000
);

-- 7. Income Sources (flat monthly recurring incomes)
CREATE TABLE income_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Salary, Freelance, Rent, etc.
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 8. Income monthly overrides (when actual income differs by month)
CREATE TABLE income_monthly_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- Always first day of month
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE(income_source_id, month_year)
);

-- 9. Cash in hand by month
CREATE TABLE cash_in_hand_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year DATE NOT NULL UNIQUE, -- Always first day of month
    amount DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- 10. Loan payment status by month (for fixed loans and jewel loan types)
CREATE TABLE loan_payment_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_kind TEXT NOT NULL CHECK (loan_kind IN ('fixed', 'jewel_type', 'investment')),
    loan_ref TEXT NOT NULL, -- fixed_loans.id, jewel type ('bank'/'pawn'), or ceetu_investments.id
    month_year DATE NOT NULL, -- Always first day of month
    is_paid BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(loan_kind, loan_ref, month_year)
);

-- 11. Loan amount monthly overrides (fixed loans + jewel loan type totals)
CREATE TABLE loan_monthly_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_kind TEXT NOT NULL CHECK (loan_kind IN ('fixed', 'jewel_type', 'investment')),
    loan_ref TEXT NOT NULL, -- fixed_loans.id, jewel type ('bank'/'pawn'), or ceetu_investments.id
    month_year DATE NOT NULL, -- Always first day of month
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE(loan_kind, loan_ref, month_year)
);

-- 1. Table for Long-term Fixed Loans
CREATE TABLE fixed_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_name TEXT NOT NULL, -- "HM Loan", "Personal Loan"
    loan_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    interest_type TEXT NOT NULL DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
    monthly_emi DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- When this is reached, the loan stops showing in the grid
    is_active BOOLEAN DEFAULT true
);

-- 12. Ceetu Investments
CREATE TABLE ceetu_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    monthly_emi DECIMAL(12,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    total_claim_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    claimed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    claim_details TEXT,
    claim_date DATE,
    is_active BOOLEAN DEFAULT true
);

-- 13. Grid comments (per cell, per month)
CREATE TABLE budget_grid_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_kind TEXT NOT NULL CHECK (cell_kind IN ('expense', 'loan', 'income', 'cash')),
    cell_ref TEXT NOT NULL, -- template_id, fixed/jewel/investment ref, income_source_id, or cash_in_hand
    month_year DATE NOT NULL, -- Always first day of month
    comment TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cell_kind, cell_ref, month_year)
);

-- 14. Budget grid audit logs (immutable change history)
CREATE TABLE budget_grid_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    month_year DATE NOT NULL, -- Always first day of month
    cell_kind TEXT NOT NULL CHECK (cell_kind IN ('expense', 'loan', 'income', 'cash', 'comment')),
    cell_ref TEXT NOT NULL,
    field_name TEXT NOT NULL CHECK (field_name IN ('amount', 'is_paid', 'comment')),
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL DEFAULT '',
    changed_by TEXT
);

-- 15. Budget grid snapshots (manual versions)
CREATE TABLE budget_grid_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    start_month DATE NOT NULL, -- first day month in snapshot scope
    end_month DATE NOT NULL -- first day month in snapshot scope
);

-- 16. Budget grid snapshot items (cell values captured per snapshot)
CREATE TABLE budget_grid_snapshot_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES budget_grid_snapshots(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- first day of month
    cell_kind TEXT NOT NULL CHECK (cell_kind IN ('expense', 'loan', 'income', 'cash', 'comment')),
    cell_ref TEXT NOT NULL,
    field_name TEXT NOT NULL CHECK (field_name IN ('amount', 'is_paid', 'comment')),
    field_value TEXT NOT NULL DEFAULT ''
);
