import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceNumber: string;
  category: string;
}

interface ExtractedStatementData {
  accountNumber: string;
  bankName: string;
  statementPeriod: {
    from: string;
    to: string;
  };
  openingBalance: string;
  closingBalance: string;
  transactions: Transaction[];
}

interface ExtractedTransactionDataProps {
  extractedData: ExtractedStatementData;
  onDataChange: (data: ExtractedStatementData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const categoryOptions = [
  { value: 'travel_expense', label: 'Travel Expense' },
  { value: 'fuel_expense', label: 'Fuel Expense' },
  { value: 'office_expense', label: 'Office Expense' },
  { value: 'construction_expense', label: 'Construction Expense' },
  { value: 'material_expense', label: 'Material Expense' },
  { value: 'salary_expense', label: 'Salary Expense' },
  { value: 'rent_expense', label: 'Rent Expense' },
  { value: 'utilities_expense', label: 'Utilities Expense' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'marketing_expense', label: 'Marketing Expense' },
  { value: 'maintenance_expense', label: 'Maintenance Expense' },
  { value: 'insurance_expense', label: 'Insurance Expense' },
  { value: 'sales_income', label: 'Sales Income' },
  { value: 'service_income', label: 'Service Income' },
  { value: 'other_income', label: 'Other Income' },
  { value: 'cgst_payable', label: 'CGST Payable' },
  { value: 'sgst_payable', label: 'SGST Payable' },
  { value: 'igst_payable', label: 'IGST Payable' },
  { value: 'cgst_receivable', label: 'CGST Receivable' },
  { value: 'sgst_receivable', label: 'SGST Receivable' },
  { value: 'igst_receivable', label: 'IGST Receivable' },
  { value: 'accounts_payable', label: 'Accounts Payable' },
  { value: 'accounts_receivable', label: 'Accounts Receivable' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' }
];

export const ExtractedTransactionData: React.FC<ExtractedTransactionDataProps> = ({
  extractedData,
  onDataChange,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ExtractedStatementData>(extractedData);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(extractedData);
  };

  const handleSaveEdit = () => {
    onDataChange(editData);
    setIsEditing(false);
    toast({
      title: "Changes saved",
      description: "Your edits have been applied to the extracted data.",
    });
  };

  const handleCancelEdit = () => {
    setEditData(extractedData);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePeriodChange = (field: 'from' | 'to', value: string) => {
    setEditData(prev => ({
      ...prev,
      statementPeriod: {
        ...prev.statementPeriod,
        [field]: value
      }
    }));
  };

  const handleTransactionChange = (index: number, field: string, value: string | number) => {
    const newTransactions = [...editData.transactions];
    newTransactions[index] = { ...newTransactions[index], [field]: value };
    setEditData(prev => ({ ...prev, transactions: newTransactions }));
  };

  const addTransaction = () => {
    setEditData(prev => ({
      ...prev,
      transactions: [...prev.transactions, {
        date: new Date().toISOString().split('T')[0],
        description: '',
        debitAmount: 0,
        creditAmount: 0,
        balance: 0,
        referenceNumber: '',
        category: 'other'
      }]
    }));
  };

  const removeTransaction = (index: number) => {
    setEditData(prev => ({
      ...prev,
      transactions: prev.transactions.filter((_, i) => i !== index)
    }));
  };

  const totalDebits = extractedData.transactions.reduce((sum, t) => sum + t.debitAmount, 0);
  const totalCredits = extractedData.transactions.reduce((sum, t) => sum + t.creditAmount, 0);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>Extracted Bank Statement Data</span>
            </CardTitle>
            <CardDescription>
              Review and edit the AI-extracted transaction information
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={onSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Transactions
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSaveEdit}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statement Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            {isEditing ? (
              <Input
                id="accountNumber"
                value={editData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.accountNumber}</div>
            )}
          </div>
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            {isEditing ? (
              <Input
                id="bankName"
                value={editData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.bankName}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="periodFrom">Statement Period From</Label>
            {isEditing ? (
              <Input
                id="periodFrom"
                type="date"
                value={editData.statementPeriod.from}
                onChange={(e) => handlePeriodChange('from', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.statementPeriod.from}</div>
            )}
          </div>
          <div>
            <Label htmlFor="periodTo">Statement Period To</Label>
            {isEditing ? (
              <Input
                id="periodTo"
                type="date"
                value={editData.statementPeriod.to}
                onChange={(e) => handlePeriodChange('to', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.statementPeriod.to}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
            {isEditing ? (
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                value={editData.openingBalance}
                onChange={(e) => handleInputChange('openingBalance', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.openingBalance}</div>
            )}
          </div>
          <div>
            <Label htmlFor="closingBalance">Closing Balance (₹)</Label>
            {isEditing ? (
              <Input
                id="closingBalance"
                type="number"
                step="0.01"
                value={editData.closingBalance}
                onChange={(e) => handleInputChange('closingBalance', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.closingBalance}</div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Debits</p>
            <p className="text-lg font-bold text-red-600">₹{totalDebits.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Credits</p>
            <p className="text-lg font-bold text-green-600">₹{totalCredits.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Net Change</p>
            <p className={`text-lg font-bold ${totalCredits - totalDebits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{(totalCredits - totalDebits).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <Label>Bank Transactions ({extractedData.transactions.length})</Label>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addTransaction}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit (₹)</TableHead>
                  <TableHead>Credit (₹)</TableHead>
                  <TableHead>Balance (₹)</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Category</TableHead>
                  {isEditing && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isEditing ? editData.transactions : extractedData.transactions).map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={transaction.date}
                          onChange={(e) => handleTransactionChange(index, 'date', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        new Date(transaction.date).toLocaleDateString()
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={transaction.description}
                          onChange={(e) => handleTransactionChange(index, 'description', e.target.value)}
                          className="min-w-48"
                        />
                      ) : (
                        transaction.description
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={transaction.debitAmount}
                          onChange={(e) => handleTransactionChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        transaction.debitAmount > 0 ? `₹${transaction.debitAmount.toLocaleString()}` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={transaction.creditAmount}
                          onChange={(e) => handleTransactionChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        transaction.creditAmount > 0 ? `₹${transaction.creditAmount.toLocaleString()}` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={transaction.balance}
                          onChange={(e) => handleTransactionChange(index, 'balance', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        `₹${transaction.balance.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={transaction.referenceNumber}
                          onChange={(e) => handleTransactionChange(index, 'referenceNumber', e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        transaction.referenceNumber
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={transaction.category} 
                          onValueChange={(value) => handleTransactionChange(index, 'category', value)}
                        >
                          <SelectTrigger className="w-40">
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
                      ) : (
                        <Badge variant="outline">
                          {categoryOptions.find(opt => opt.value === transaction.category)?.label || transaction.category}
                        </Badge>
                      )}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        {editData.transactions.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTransaction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};