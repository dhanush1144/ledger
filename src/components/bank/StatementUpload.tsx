import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StatementUploadProps {
  onDataExtracted: (data: any) => void;
}

export const StatementUpload: React.FC<StatementUploadProps> = ({ onDataExtracted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a JPG, PNG, or PDF file',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processWithAI = async () => {
    if (!selectedFile || !user) return;

    setProcessing(true);
    setProcessingStep('Uploading file...');

    try {
      // Upload file to Supabase storage
      setUploading(true);
      const fileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bills')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      setUploading(false);
      setProcessingStep('Converting file for AI processing...');

      // Convert file to base64 for Gemini processing
      const imageBase64 = await convertFileToBase64(selectedFile);

      setProcessingStep('Analyzing bank statement with AI...');

      // Call the AI processing function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-bank-statement-ai', {
        body: {
          statementData: {},
          imageBase64: imageBase64
        }
      });

      if (aiError) {
        console.error('Supabase function error:', aiError);
        throw new Error(`AI processing failed: ${aiError.message}`);
      }

      console.log('AI processing result:', aiResult);

      if (aiResult.success && aiResult.extractedData) {
        setProcessingStep('Processing complete!');
        
        // Validate that we have real data, not sample data
        const hasRealData = aiResult.extractedData.transactions && 
                           aiResult.extractedData.transactions.length > 0 &&
                           !aiResult.extractedData.transactions[0].description?.includes('SAMPLE');

        if (!hasRealData) {
          toast({
            title: 'AI Processing Notice',
            description: 'The AI could not extract clear transaction data from the image. Please ensure the bank statement is clear and readable, or try a different image.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Bank statement processed successfully',
            description: `AI extracted ${aiResult.extractedData.transactions.length} transactions. Please review and save.`,
          });
        }
        
        onDataExtracted(aiResult.extractedData);
        
        // Clear the selected file
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(aiResult.error || 'Failed to extract data from bank statement');
      }

    } catch (error: any) {
      console.error('Error processing bank statement:', error);
      toast({
        title: 'Error processing bank statement',
        description: error.message || 'Failed to process the uploaded bank statement. Please try again with a clearer image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      >
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-400 mb-4">PNG, JPG, PDF up to 10MB</p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mb-2"
          disabled={uploading || processing}
        >
          <Upload className="mr-2 h-4 w-4" />
          Select Bank Statement
        </Button>
      </div>

      {/* Processing Status */}
      {(uploading || processing) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{processingStep}</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: uploading ? '30%' : processing ? '80%' : '100%' 
              }}
            />
          </div>
        </div>
      )}

      {/* Process Button */}
      {selectedFile && !processing && !uploading && (
        <Button
          onClick={processWithAI}
          disabled={uploading || processing}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Process with AI
        </Button>
      )}

      {/* AI Processing Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Processing Tips:</strong> For best results, ensure your bank statement image is clear, well-lit, 
          and all text is readable. The AI will extract transaction details, dates, amounts, and automatically categorize expenses.
        </AlertDescription>
      </Alert>
    </div>
  );
};