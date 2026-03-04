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
    loan_kind TEXT NOT NULL CHECK (loan_kind IN ('fixed', 'jewel_type')),
    loan_ref TEXT NOT NULL, -- fixed_loans.id (uuid as text) OR jewel type ('bank'/'pawn')
    month_year DATE NOT NULL, -- Always first day of month
    is_paid BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(loan_kind, loan_ref, month_year)
);

-- 1. Table for Long-term Fixed Loans
CREATE TABLE fixed_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_name TEXT NOT NULL, -- "HM Loan", "Personal Loan"
    monthly_emi DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- When this is reached, the loan stops showing in the grid
    is_active BOOLEAN DEFAULT true
);
