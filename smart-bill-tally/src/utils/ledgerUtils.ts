
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type LedgerCategory = Database['public']['Enums']['ledger_category'];

// Enhanced categorization logic
export const categorizeTransaction = (description: string): LedgerCategory => {
  const desc = description.toLowerCase();
  
  // Travel and fuel expenses
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel') || 
      desc.includes('hp') || desc.includes('ioc') || desc.includes('bpcl') || 
      desc.includes('shell') || desc.includes('reliance')) {
    return 'travel_expense';
  }
  
  // Office expenses
  if (desc.includes('office') || desc.includes('stationery') || desc.includes('supplies')) {
    return 'office_expense';
  }
  
  // Construction expenses
  if (desc.includes('construction') || desc.includes('cement') || desc.includes('steel') || 
      desc.includes('building') || desc.includes('contractor')) {
    return 'construction_expense';
  }
  
  // Material expenses
  if (desc.includes('material') || desc.includes('hardware') || desc.includes('equipment')) {
    return 'material_expense';
  }
  
  // Rent expenses
  if (desc.includes('rent') || desc.includes('lease')) {
    return 'rent_expense';
  }
  
  // Utilities
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') || 
      desc.includes('utility') || desc.includes('mseb') || desc.includes('bses')) {
    return 'utilities_expense';
  }
  
  // Professional fees
  if (desc.includes('professional') || desc.includes('consultant') || desc.includes('legal') || 
      desc.includes('audit') || desc.includes('ca ') || desc.includes('advocate')) {
    return 'professional_fees';
  }
  
  // Salary
  if (desc.includes('salary') || desc.includes('wages') || desc.includes('payroll')) {
    return 'salary_expense';
  }
  
  // Sales income
  if (desc.includes('sale') || desc.includes('invoice') || desc.includes('receipt') || 
      desc.includes('payment received')) {
    return 'sales_income';
  }
  
  // Service income
  if (desc.includes('service') || desc.includes('consulting') || desc.includes('fees received')) {
    return 'service_income';
  }
  
  // Bank/Cash
  if (desc.includes('cash withdrawal') || desc.includes('atm') || desc.includes('transfer')) {
    return 'bank';
  }
  
  return 'other';
};

// Extract party name from description
export const extractPartyName = (description: string): string => {
  const words = description.split(' ');
  return words.slice(0, 2).join(' ') || 'Unknown Party';
};

// Create ledger entries for bill uploads
export const createBillLedgerEntries = async (billId: string, userId: string) => {
  try {
    console.log('Creating ledger entries for bill:', billId);
    
    // Fetch bill details
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      console.error('Error fetching bill:', billError);
      return;
    }

    const ledgerEntries = [];
    const category = categorizeTransaction(bill.description || bill.vendor_name);
    
    // 1. Vendor/Party Entry (Credit side for purchases)
    ledgerEntries.push({
      user_id: userId,
      bill_id: billId,
      party_name: bill.vendor_name,
      account_name: `${bill.vendor_name} - ${bill.bill_type}`,
      category: 'accounts_payable' as LedgerCategory,
      debit_amount: 0,
      credit_amount: bill.total_amount,
      description: `Bill ${bill.bill_number} - ${bill.description}`,
      date: bill.bill_date
    });

    // 2. Expense Category Entry (Debit side)
    const baseAmount = bill.total_amount - bill.tax_amount;
    ledgerEntries.push({
      user_id: userId,
      bill_id: billId,
      party_name: bill.vendor_name,
      account_name: category.replace('_', ' ').toUpperCase(),
      category: category,
      debit_amount: baseAmount,
      credit_amount: 0,
      description: `${bill.vendor_name} - ${bill.description}`,
      date: bill.bill_date
    });

    // 3. GST Entries if applicable
    if (bill.cgst > 0) {
      ledgerEntries.push({
        user_id: userId,
        bill_id: billId,
        party_name: bill.vendor_name,
        account_name: 'CGST Receivable',
        category: 'cgst_receivable' as LedgerCategory,
        debit_amount: bill.cgst,
        credit_amount: 0,
        description: `CGST on Bill ${bill.bill_number}`,
        date: bill.bill_date
      });
    }

    if (bill.sgst > 0) {
      ledgerEntries.push({
        user_id: userId,
        bill_id: billId,
        party_name: bill.vendor_name,
        account_name: 'SGST Receivable',
        category: 'sgst_receivable' as LedgerCategory,
        debit_amount: bill.sgst,
        credit_amount: 0,
        description: `SGST on Bill ${bill.bill_number}`,
        date: bill.bill_date
      });
    }

    if (bill.igst > 0) {
      ledgerEntries.push({
        user_id: userId,
        bill_id: billId,
        party_name: bill.vendor_name,
        account_name: 'IGST Receivable',
        category: 'igst_receivable' as LedgerCategory,
        debit_amount: bill.igst,
        credit_amount: 0,
        description: `IGST on Bill ${bill.bill_number}`,
        date: bill.bill_date
      });
    }

    // Insert all ledger entries
    const { error: ledgerError } = await supabase
      .from('detailed_ledgers')
      .insert(ledgerEntries);

    if (ledgerError) {
      console.error('Error creating ledger entries:', ledgerError);
    } else {
      console.log(`Created ${ledgerEntries.length} ledger entries for bill ${bill.bill_number}`);
    }

  } catch (error) {
    console.error('Error in createBillLedgerEntries:', error);
  }
};

// Create ledger entries for bank transactions
export const createBankTransactionLedgerEntries = async (transaction: any, userId: string) => {
  try {
    const ledgerEntries = [];
    const partyName = extractPartyName(transaction.description);
    const category = categorizeTransaction(transaction.description);
    
    // Main transaction entry
    ledgerEntries.push({
      user_id: userId,
      party_name: partyName,
      account_name: transaction.description,
      category: category,
      debit_amount: transaction.debit_amount,
      credit_amount: transaction.credit_amount,
      description: transaction.description,
      date: transaction.transaction_date
    });

    // Bank account entry (opposite side)
    ledgerEntries.push({
      user_id: userId,
      party_name: 'Bank Account',
      account_name: 'Current Account',
      category: 'bank' as LedgerCategory,
      debit_amount: transaction.credit_amount,
      credit_amount: transaction.debit_amount,
      description: `Bank ${transaction.debit_amount > 0 ? 'Payment' : 'Receipt'} - ${transaction.description}`,
      date: transaction.transaction_date
    });

    const { error } = await supabase
      .from('detailed_ledgers')
      .insert(ledgerEntries);

    if (error) {
      console.error('Error creating transaction ledger entries:', error);
    }
  } catch (error) {
    console.error('Error in createBankTransactionLedgerEntries:', error);
  }
};

// Migrate existing bills to create ledger entries
export const migrateExistingBills = async (userId: string) => {
  try {
    console.log('Migrating existing bills for user:', userId);
    
    // Get all bills without ledger entries
    const { data: bills, error } = await supabase
      .from('bills')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching bills for migration:', error);
      return;
    }

    // Create ledger entries for each bill
    for (const bill of bills || []) {
      await createBillLedgerEntries(bill.id, userId);
    }

    console.log(`Migrated ${bills?.length || 0} existing bills`);
  } catch (error) {
    console.error('Error in migrateExistingBills:', error);
  }
};
