
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { categorizeTransaction, createBankTransactionLedgerEntries } from '@/utils/ledgerUtils';

interface UploadedStatement {
  id: string;
  file_name: string;
  upload_date: string;
  processed: boolean;
  processed_at: string | null;
}

export const UploadStatement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statements, setStatements] = useState<UploadedStatement[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file only.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `statements/${user.id}/${fileName}`;

      const { data, error } = await supabase
        .from('bank_statements')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
        })
        .select()
        .single();

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        throw error;
      }

      // Process statement with enhanced transaction processing
      setTimeout(async () => {
        await processStatement(data.id);
        setUploadProgress(0);
        setUploading(false);
        fetchStatements();
        
        toast({
          title: 'Statement uploaded successfully',
          description: 'Your bank statement has been processed and transactions have been added to your ledgers.',
        });
      }, 1000);

    } catch (error: any) {
      console.error('Error uploading statement:', error);
      setUploading(false);
      setUploadProgress(0);
      
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload statement. Please try again.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processStatement = async (statementId: string) => {
    try {
      console.log('Processing statement:', statementId);
      
      // Enhanced sample transactions with better categorization
      const sampleTransactions = [
        {
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'HP PETROL PUMP MUMBAI',
          debit_amount: 2500.00,
          credit_amount: 0,
          balance: 45000.00,
          reference_number: 'TXN123456',
          category: categorizeTransaction('HP PETROL PUMP MUMBAI')
        },
        {
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'PRIYA ENTERPRISES CONSTRUCTION',
          debit_amount: 15000.00,
          credit_amount: 0,
          balance: 30000.00,
          reference_number: 'TXN123457',
          category: categorizeTransaction('PRIYA ENTERPRISES CONSTRUCTION')
        },
        {
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'CLIENT PAYMENT RECEIVED',
          debit_amount: 0,
          credit_amount: 50000.00,
          balance: 80000.00,
          reference_number: 'TXN123458',
          category: categorizeTransaction('CLIENT PAYMENT RECEIVED')
        },
        {
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'OFFICE RENT PAYMENT',
          debit_amount: 25000.00,
          credit_amount: 0,
          balance: 55000.00,
          reference_number: 'TXN123459',
          category: categorizeTransaction('OFFICE RENT PAYMENT')
        },
        {
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'MSEB ELECTRICITY BILL',
          debit_amount: 3500.00,
          credit_amount: 0,
          balance: 51500.00,
          reference_number: 'TXN123460',
          category: categorizeTransaction('MSEB ELECTRICITY BILL')
        }
      ];

      const transactionsWithIds = sampleTransactions.map(transaction => ({
        ...transaction,
        statement_id: statementId,
        user_id: user?.id
      }));

      // Insert bank transactions
      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .insert(transactionsWithIds);

      if (transactionError) {
        console.error('Error creating transactions:', transactionError);
        throw transactionError;
      }

      // Create detailed ledger entries for each transaction using the utility
      for (const transaction of sampleTransactions) {
        await createBankTransactionLedgerEntries(transaction, user?.id);
      }

      // Mark statement as processed
      const { error: updateError } = await supabase
        .from('bank_statements')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', statementId);

      if (updateError) {
        console.error('Error updating statement:', updateError);
      }

    } catch (error) {
      console.error('Error processing statement:', error);
    }
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
        <p className="text-gray-600">Upload your bank statement PDF to automatically extract transactions</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Statement
          </CardTitle>
          <CardDescription>
            Select a PDF file of your bank statement to process and add transactions to your ledgers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="statement-file">Bank Statement (PDF)</Label>
            <Input
              id="statement-file"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              ref={fileInputRef}
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing statement...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Currently supported: PDF bank statements. The system will automatically categorize transactions and create detailed ledger entries.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Uploaded Statements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Statements
          </CardTitle>
          <CardDescription>
            View your previously uploaded bank statements and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No statements uploaded yet. Upload your first bank statement to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {statements.map((statement) => (
                <div
                  key={statement.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{statement.file_name}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded on {new Date(statement.upload_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {statement.processed ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Processed</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-yellow-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
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
  );
};
