
-- Create profiles table first
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Now create the enum types
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
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to profiles table
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN user_type public.user_type DEFAULT 'individual';
ALTER TABLE public.profiles ADD COLUMN company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN gst_number TEXT;

-- Create organization_access table for accountant permissions
CREATE TABLE public.organization_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accountant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(accountant_id, organization_id)
);

-- Create detailed_ledgers table for multiple ledger entries per bill
CREATE TABLE public.detailed_ledgers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
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

-- Create bank_statements table for uploaded statements
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create bank_transactions table for extracted transactions
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID REFERENCES public.bank_statements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2),
  reference_number TEXT,
  category public.ledger_category DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies they have access to" 
  ON public.companies FOR SELECT 
  USING (
    id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_access 
      WHERE accountant_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Users can create companies" 
  ON public.companies FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for organization_access
CREATE POLICY "Users can view their access requests" 
  ON public.organization_access FOR SELECT 
  USING (accountant_id = auth.uid() OR approved_by = auth.uid());

CREATE POLICY "Accountants can create access requests" 
  ON public.organization_access FOR INSERT 
  WITH CHECK (accountant_id = auth.uid());

CREATE POLICY "Organization owners can update access requests" 
  ON public.organization_access FOR UPDATE 
  USING (approved_by = auth.uid() OR auth.uid() IN (
    SELECT p.id FROM public.profiles p 
    JOIN public.companies c ON p.company_id = c.id 
    WHERE c.id = organization_id
  ));

-- RLS Policies for detailed_ledgers
CREATE POLICY "Users can view their detailed ledgers" 
  ON public.detailed_ledgers FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    auth.uid() IN (
      SELECT accountant_id FROM public.organization_access 
      WHERE organization_id IN (
        SELECT company_id FROM public.profiles WHERE id = user_id
      ) AND status = 'approved'
    )
  );

CREATE POLICY "Users can create detailed ledgers" 
  ON public.detailed_ledgers FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for bank_statements
CREATE POLICY "Users can view their bank statements" 
  ON public.bank_statements FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bank statements" 
  ON public.bank_statements FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for bank_transactions
CREATE POLICY "Users can view their bank transactions" 
  ON public.bank_transactions FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bank transactions" 
  ON public.bank_transactions FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_detailed_ledgers_user_id ON public.detailed_ledgers(user_id);
CREATE INDEX idx_detailed_ledgers_bill_id ON public.detailed_ledgers(bill_id);
CREATE INDEX idx_detailed_ledgers_category ON public.detailed_ledgers(category);
CREATE INDEX idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX idx_bank_transactions_statement_id ON public.bank_transactions(statement_id);
CREATE INDEX idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX idx_organization_access_accountant_id ON public.organization_access(accountant_id);
CREATE INDEX idx_organization_access_organization_id ON public.organization_access(organization_id);
