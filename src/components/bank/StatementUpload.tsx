import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface StatementUploadProps {
  onDataExtracted: (data: any) => void;
}

export const StatementUpload: React.FC<StatementUploadProps> = ({ onDataExtracted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

      // Convert file to base64 for Gemini processing
      const imageBase64 = await convertFileToBase64(selectedFile);

      // Call the AI processing function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-bank-statement-ai', {
        body: {
          statementData: {},
          imageBase64: imageBase64
        }
      });

      if (aiError) {
        throw aiError;
      }

      if (aiResult.success && aiResult.extractedData) {
        onDataExtracted(aiResult.extractedData);
        toast({
          title: 'Bank statement processed successfully',
          description: 'AI has extracted transaction data. Please review and save.',
        });
        
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
        description: error.message || 'Failed to process the uploaded bank statement',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProcessing(false);
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

      {/* Process Button */}
      {selectedFile && (
        <Button
          onClick={processWithAI}
          disabled={uploading || processing}
          className="w-full"
        >
          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {processing && !uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {uploading ? 'Uploading...' : processing ? 'Processing with AI...' : 'Process with AI'}
        </Button>
      )}
    </div>
  );
};