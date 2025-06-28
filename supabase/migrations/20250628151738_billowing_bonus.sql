/*
  # Initial Database Schema Setup

  1. New Tables
    - `profiles` - User profile information with role management
    - `companies` - Company/organization details
    - `bills` - Invoice and bill storage
    - `bill_items` - Individual line items for bills
    - `ledger_entries` - Basic ledger entries
    - `detailed_ledgers` - Enhanced ledger with categorization
    - `bank_statements` - Uploaded bank statement files
    - `bank_transactions` - Extracted bank transactions
    - `organization_access` - Accountant access to organizations

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Create proper indexes for performance

  3. Enums
    - `user_type` - individual, organization, accountant
    - `ledger_category` - comprehensive expense/income categories
*/

-- Create enum types first
CREATE TYPE public.user_type AS ENUM ('individual', 'organization', 'accountant');

CREATE TYPE public.ledger_category AS ENUM (
  'travel_expense', 'fuel_expense', 'office_expense', 'construction_expense', 
  'material_expense', 'salary_expense', 'rent_expense', 'utilities_expense',
  'professional_fees', 'marketing_expense', 'maintenance_expense', 'insurance_expense',
  'sales_income', 'service_income', 'other_income',
  'cgst_payable', 'sgst_payable', 'igst_payable', 'cgst_receivable', 'sgst_receivable', 'igst_receivable',
  'accounts_payable', 'accounts_receivable', 'cash', 'bank', 'other'
);

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  user_type public.user_type DEFAULT 'individual',
  company_id UUID REFERENCES public.companies(id),
  company_name TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bill_number TEXT NOT NULL,
  bill_type TEXT NOT NULL DEFAULT 'purchase',
  bill_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  cgst DECIMAL(12,2) DEFAULT 0,
  sgst DECIMAL(12,2) DEFAULT 0,
  igst DECIMAL(12,2) DEFAULT 0,
  vendor_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ledger_entries table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  amount DECIMAL(12,2) NOT NULL,
  balance DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create detailed_ledgers table
CREATE TABLE IF NOT EXISTS public.detailed_ledgers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  category public.ledger_category NOT NULL,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_statements table
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID REFERENCES public.bank_statements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2),
  reference_number TEXT,
  category public.ledger_category DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_access table
CREATE TABLE IF NOT EXISTS public.organization_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accountant_id UUID NOT NULL,
  organization_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  UNIQUE(accountant_id, organization_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can create their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid()::text = id::text);

-- RLS Policies for companies
CREATE POLICY "Users can view companies they have access to" 
  ON public.companies FOR SELECT 
  USING (
    id IN (
      SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text
      UNION
      SELECT organization_id FROM public.organization_access 
      WHERE accountant_id::text = auth.uid()::text AND status = 'approved'
    )
  );

CREATE POLICY "Users can create companies" 
  ON public.companies FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for bills
CREATE POLICY "Users can view their own bills" 
  ON public.bills FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own bills" 
  ON public.bills FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own bills" 
  ON public.bills FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own bills" 
  ON public.bills FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for bill_items
CREATE POLICY "Users can view bill items for their bills" 
  ON public.bill_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bills WHERE bills.id = bill_items.bill_id AND bills.user_id::text = auth.uid()::text));

CREATE POLICY "Users can create bill items for their bills" 
  ON public.bill_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bills WHERE bills.id = bill_items.bill_id AND bills.user_id::text = auth.uid()::text));

CREATE POLICY "Users can update bill items for their bills" 
  ON public.bill_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.bills WHERE bills.id = bill_items.bill_id AND bills.user_id::text = auth.uid()::text));

CREATE POLICY "Users can delete bill items for their bills" 
  ON public.bill_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.bills WHERE bills.id = bill_items.bill_id AND bills.user_id::text = auth.uid()::text));

-- RLS Policies for ledger_entries
CREATE POLICY "Users can view their own ledger entries" 
  ON public.ledger_entries FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own ledger entries" 
  ON public.ledger_entries FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own ledger entries" 
  ON public.ledger_entries FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own ledger entries" 
  ON public.ledger_entries FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for detailed_ledgers
CREATE POLICY "Users can view their detailed ledgers" 
  ON public.detailed_ledgers FOR SELECT 
  USING (
    user_id::text = auth.uid()::text OR 
    auth.uid()::text IN (
      SELECT accountant_id::text FROM public.organization_access 
      WHERE organization_id IN (
        SELECT company_id FROM public.profiles WHERE id::text = user_id::text
      ) AND status = 'approved'
    )
  );

CREATE POLICY "Users can create detailed ledgers" 
  ON public.detailed_ledgers FOR INSERT 
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update detailed ledgers" 
  ON public.detailed_ledgers FOR UPDATE 
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete detailed ledgers" 
  ON public.detailed_ledgers FOR DELETE 
  USING (user_id::text = auth.uid()::text);

-- RLS Policies for bank_statements
CREATE POLICY "Users can view their bank statements" 
  ON public.bank_statements FOR SELECT 
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create bank statements" 
  ON public.bank_statements FOR INSERT 
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update bank statements" 
  ON public.bank_statements FOR UPDATE 
  USING (user_id::text = auth.uid()::text);

-- RLS Policies for bank_transactions
CREATE POLICY "Users can view their bank transactions" 
  ON public.bank_transactions FOR SELECT 
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create bank transactions" 
  ON public.bank_transactions FOR INSERT 
  WITH CHECK (user_id::text = auth.uid()::text);

-- RLS Policies for organization_access
CREATE POLICY "Users can view their access requests" 
  ON public.organization_access FOR SELECT 
  USING (accountant_id::text = auth.uid()::text OR approved_by::text = auth.uid()::text);

CREATE POLICY "Accountants can create access requests" 
  ON public.organization_access FOR INSERT 
  WITH CHECK (accountant_id::text = auth.uid()::text);

CREATE POLICY "Organization owners can update access requests" 
  ON public.organization_access FOR UPDATE 
  USING (approved_by::text = auth.uid()::text OR auth.uid()::text IN (
    SELECT p.id::text FROM public.profiles p 
    JOIN public.companies c ON p.company_id = c.id 
    WHERE c.id = organization_id
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON public.bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON public.ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_detailed_ledgers_user_id ON public.detailed_ledgers(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_ledgers_bill_id ON public.detailed_ledgers(bill_id);
CREATE INDEX IF NOT EXISTS idx_detailed_ledgers_category ON public.detailed_ledgers(category);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement_id ON public.bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_access_accountant_id ON public.organization_access(accountant_id);
CREATE INDEX IF NOT EXISTS idx_organization_access_organization_id ON public.organization_access(organization_id);

-- Create storage bucket for bill documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bills',
  'bills',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bills bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own bills'
  ) THEN
    CREATE POLICY "Users can upload their own bills"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'bills' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own bills'
  ) THEN
    CREATE POLICY "Users can view their own bills"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'bills' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own bills'
  ) THEN
    CREATE POLICY "Users can delete their own bills"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'bills' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;