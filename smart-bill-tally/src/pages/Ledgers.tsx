import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Filter, Download, TrendingUp, TrendingDown, Search, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { migrateExistingBills } from '@/utils/ledgerUtils';
import { useToast } from '@/components/ui/use-toast';

interface DetailedLedgerEntry {
  id: string;
  date: string;
  party_name: string;
  account_name: string;
  category: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  bill_id?: string;
}

interface BillDetails {
  id: string;
  vendor_name: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  tax_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  description: string;
  bill_type: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export const Ledgers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ledgerEntries, setLedgerEntries] = useState<DetailedLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillDetails | null>(null);

  useEffect(() => {
    if (user) {
      fetchDetailedLedgerEntries();
    }
  }, [user]);

  const fetchDetailedLedgerEntries = async () => {
    try {
      console.log('Fetching detailed ledger entries for user:', user?.id);
      
      const { data, error } = await supabase
        .from('detailed_ledgers')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching detailed ledger entries:', error);
        throw error;
      }

      console.log('Fetched detailed ledger entries:', data);
      setLedgerEntries(data || []);
      
    } catch (error) {
      console.error('Error fetching detailed ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateExistingData = async () => {
    if (!user) return;
    
    setMigrating(true);
    try {
      await migrateExistingBills(user.id);
      await fetchDetailedLedgerEntries();
      
      toast({
        title: 'Migration completed',
        description: 'Existing bills have been processed and ledger entries created.',
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration failed',
        description: 'There was an error migrating existing data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  const fetchBillDetails = async (billId: string) => {
    try {
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (billError) {
        console.error('Error fetching bill:', billError);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId);

      if (itemsError) {
        console.error('Error fetching bill items:', itemsError);
      }

      setSelectedBill({
        ...billData,
        items: itemsData || []
      });
    } catch (error) {
      console.error('Error in fetchBillDetails:', error);
    }
  };

  const filteredEntries = ledgerEntries.filter(entry => {
    // Category filter
    if (filterType !== 'all' && entry.category !== filterType) return false;
    
    // Date range filter
    if (dateRange.from && entry.date < dateRange.from) return false;
    if (dateRange.to && entry.date > dateRange.to) return false;
    
    // Search filter - search in party name, account name, description, and category
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesParty = entry.party_name.toLowerCase().includes(searchLower);
      const matchesAccount = entry.account_name.toLowerCase().includes(searchLower);
      const matchesDescription = entry.description?.toLowerCase().includes(searchLower);
      const matchesCategory = entry.category.toLowerCase().includes(searchLower);
      
      if (!matchesParty && !matchesAccount && !matchesDescription && !matchesCategory) {
        return false;
      }
    }
    
    return true;
  });

  const totalDebits = filteredEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
  const totalCredits = filteredEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
  const netBalance = totalCredits - totalDebits;

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'travel_expense', label: 'Travel Expense' },
    { value: 'fuel_expense', label: 'Fuel Expense' },
    { value: 'office_expense', label: 'Office Expense' },
    { value: 'construction_expense', label: 'Construction Expense' },
    { value: 'material_expense', label: 'Material Expense' },
    { value: 'salary_expense', label: 'Salary Expense' },
    { value: 'rent_expense', label: 'Rent Expense' },
    { value: 'utilities_expense', label: 'Utilities Expense' },
    { value: 'professional_fees', label: 'Professional Fees' },
    { value: 'sales_income', label: 'Sales Income' },
    { value: 'service_income', label: 'Service Income' },
    { value: 'cgst_payable', label: 'CGST Payable' },
    { value: 'sgst_payable', label: 'SGST Payable' },
    { value: 'igst_payable', label: 'IGST Payable' },
    { value: 'cgst_receivable', label: 'CGST Receivable' },
    { value: 'sgst_receivable', label: 'SGST Receivable' },
    { value: 'igst_receivable', label: 'IGST Receivable' },
    { value: 'accounts_payable', label: 'Accounts Payable' },
    { value: 'accounts_receivable', label: 'Accounts Receivable' },
    { value: 'bank', label: 'Bank' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ledger Management</h1>
          <p className="text-gray-600">
            Track all your financial transactions with detailed categorization
          </p>
        </div>
        
        {ledgerEntries.length === 0 && (
          <Button 
            onClick={handleMigrateExistingData} 
            disabled={migrating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${migrating ? 'animate-spin' : ''}`} />
            {migrating ? 'Migrating...' : 'Generate Ledgers'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalDebits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outgoing transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Incoming transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Net position</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search parties, accounts, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Ledger Entries</CardTitle>
          <CardDescription>
            Detailed view of all financial transactions with party-wise tracking ({filteredEntries.length} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {ledgerEntries.length === 0 ? (
                        <div className="space-y-2">
                          <p>No ledger entries found.</p>
                          <p className="text-sm">Upload bank statements or bills, or click "Generate Ledgers" to process existing data.</p>
                        </div>
                      ) : (
                        'No entries match your current filters.'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{entry.party_name}</TableCell>
                      <TableCell>{entry.account_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.category.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.bill_id && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => fetchBillDetails(entry.bill_id!)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Bill Details</DialogTitle>
                                <DialogDescription>
                                  Complete bill information and line items
                                </DialogDescription>
                              </DialogHeader>
                              {selectedBill && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h3 className="font-semibold">Vendor Information</h3>
                                      <p><strong>Name:</strong> {selectedBill.vendor_name}</p>
                                      <p><strong>Bill Number:</strong> {selectedBill.bill_number}</p>
                                      <p><strong>Date:</strong> {new Date(selectedBill.bill_date).toLocaleDateString()}</p>
                                      <p><strong>Type:</strong> {selectedBill.bill_type}</p>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">Financial Summary</h3>
                                      <p><strong>Total Amount:</strong> ₹{selectedBill.total_amount.toLocaleString()}</p>
                                      <p><strong>Tax Amount:</strong> ₹{selectedBill.tax_amount.toLocaleString()}</p>
                                      <p><strong>CGST:</strong> ₹{selectedBill.cgst.toLocaleString()}</p>
                                      <p><strong>SGST:</strong> ₹{selectedBill.sgst.toLocaleString()}</p>
                                      <p><strong>IGST:</strong> ₹{selectedBill.igst.toLocaleString()}</p>
                                    </div>
                                  </div>
                                  
                                  {selectedBill.description && (
                                    <div>
                                      <h3 className="font-semibold">Description</h3>
                                      <p>{selectedBill.description}</p>
                                    </div>
                                  )}
                                  
                                  {selectedBill.items && selectedBill.items.length > 0 && (
                                    <div>
                                      <h3 className="font-semibold">Line Items</h3>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedBill.items.map((item, index) => (
                                            <TableRow key={index}>
                                              <TableCell>{item.name}</TableCell>
                                              <TableCell>{item.quantity}</TableCell>
                                              <TableCell>₹{item.price.toLocaleString()}</TableCell>
                                              <TableCell>₹{item.total.toLocaleString()}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
