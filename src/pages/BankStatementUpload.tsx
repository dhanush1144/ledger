import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { StatementUpload } from '@/components/bank/StatementUpload';
import { ExtractedTransactionData } from '@/components/bank/ExtractedTransactionData';
import { createBankTransactionLedgerEntries } from '@/utils/ledgerUtils';

interface UploadedStatement {
  id: string;
  file_name: string;
  upload_date: string;
  processed: boolean;
  processed_at: string | null;
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
  transactions: Array<{
    date: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
    balance: number;
    referenceNumber: string;
    category: string;
  }>;
}

export const BankStatementUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statements, setStatements] = useState<UploadedStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedStatementData | null>(null);

  useEffect(() => {
    if (user) {
      fetchStatements();
    }
  }, [user]);

  const fetchStatements = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error fetching statements:', error);
        return;
      }

      setStatements(data || []);
    } catch (error) {
      console.error('Error in fetchStatements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDataExtracted = (data: ExtractedStatementData) => {
    console.log('Extracted statement data received:', data);
    setExtractedData(data);
  };

  const handleDataChange = (data: ExtractedStatementData) => {
    setExtractedData(data);
  };

  const handleSaveTransactions = async () => {
    if (!extractedData || !user) return;

    setSaving(true);

    try {
      // Create bank statement record
      const { data: statement, error: statementError } = await supabase
        .from('bank_statements')
        .insert({
          user_id: user.id,
          file_name: `AI_Processed_Statement_${Date.now()}.pdf`,
          file_path: `statements/${user.id}/ai_processed_${Date.now()}.pdf`,
          processed: true,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (statementError) {
        throw statementError;
      }

      // Save bank transactions
      const transactionsWithIds = extractedData.transactions.map(transaction => ({
        statement_id: statement.id,
        user_id: user.id,
        transaction_date: transaction.date,
        description: transaction.description,
        debit_amount: transaction.debitAmount,
        credit_amount: transaction.creditAmount,
        balance: transaction.balance,
        reference_number: transaction.referenceNumber,
        category: transaction.category as any
      }));

      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .insert(transactionsWithIds);

      if (transactionError) {
        throw transactionError;
      }

      // Create detailed ledger entries for each transaction
      for (const transaction of extractedData.transactions) {
        await createBankTransactionLedgerEntries(transaction, user.id);
      }

      toast({
        title: 'Bank statement processed successfully',
        description: `${extractedData.transactions.length} transactions have been saved and ledger entries created.`,
      });

      // Reset form and refresh statements
      setExtractedData(null);
      fetchStatements();

    } catch (error: any) {
      console.error('Error saving bank statement:', error);
      toast({
        title: 'Error saving bank statement',
        description: error.message || 'Failed to save transaction data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Bank Statement</h1>
        <p className="text-gray-600">Upload your bank statement to automatically extract and categorize transactions with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Bank Statement
            </CardTitle>
            <CardDescription>
              Upload an image or PDF of your bank statement for AI processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatementUpload onDataExtracted={handleDataExtracted} />
          </CardContent>
        </Card>

        {/* Statement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Statements
            </CardTitle>
            <CardDescription>
              View your previously uploaded bank statements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No statements uploaded yet. Upload your first bank statement to get started.
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {statements.slice(0, 5).map((statement) => (
                  <div
                    key={statement.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{statement.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(statement.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {statement.processed ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">Processed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-yellow-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Processing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Processing Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI-Powered Processing:</strong> Our system uses Google Gemini AI to automatically extract transaction details, 
          categorize expenses, and create detailed ledger entries. Review the extracted data before saving to ensure accuracy.
        </AlertDescription>
      </Alert>

      {/* Extracted Data Display */}
      {extractedData && (
        <ExtractedTransactionData
          extractedData={extractedData}
          onDataChange={handleDataChange}
          onSave={handleSaveTransactions}
          onCancel={handleCancel}
        />
      )}

      {/* Save Button */}
      {extractedData && (
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveTransactions} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Transactions...
              </>
            ) : (
              `Save ${extractedData.transactions.length} Transactions`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};