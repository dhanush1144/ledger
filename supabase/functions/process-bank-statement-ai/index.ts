import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { statementData, imageBase64 } = await req.json();
    console.log('Processing bank statement with AI:', statementData);
    
    let extractedTransactions;

    if (imageBase64) {
      // Process bank statement image with Gemini Vision API
      console.log('Processing bank statement image with Gemini API...');
      
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) {
        console.error('Gemini API key not found in environment variables');
        throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.');
      }
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analyze this bank statement image and extract ALL transaction data. Return a JSON object with this exact structure:

{
  "accountNumber": "extract account number if visible, otherwise use 'XXXX1234'",
  "bankName": "extract bank name if visible, otherwise use 'Bank Name'",
  "statementPeriod": {
    "from": "YYYY-MM-DD format - extract statement start date",
    "to": "YYYY-MM-DD format - extract statement end date"
  },
  "openingBalance": "extract opening balance amount as string",
  "closingBalance": "extract closing balance amount as string",
  "transactions": [
    {
      "date": "YYYY-MM-DD format",
      "description": "full transaction description",
      "debitAmount": "debit amount as number (0 if credit transaction)",
      "creditAmount": "credit amount as number (0 if debit transaction)",
      "balance": "running balance after this transaction",
      "referenceNumber": "cheque number, reference number, or transaction ID",
      "category": "categorize based on description - choose from: travel_expense, fuel_expense, office_expense, construction_expense, material_expense, salary_expense, rent_expense, utilities_expense, professional_fees, marketing_expense, maintenance_expense, insurance_expense, sales_income, service_income, other_income, cgst_payable, sgst_payable, igst_payable, cgst_receivable, sgst_receivable, igst_receivable, accounts_payable, accounts_receivable, cash, bank, other"
    }
  ]
}

IMPORTANT INSTRUCTIONS:
1. Extract EVERY transaction visible in the statement
2. For amounts, extract only the numeric value (no currency symbols)
3. Categorize transactions intelligently:
   - Fuel/Petrol → fuel_expense
   - Rent payments → rent_expense
   - Electricity/Water bills → utilities_expense
   - Salary payments → salary_expense
   - Client payments received → sales_income
   - Construction materials → construction_expense
   - Office supplies → office_expense
   - Professional services → professional_fees
   - Travel expenses → travel_expense
   - Bank charges → bank
   - Others → other
4. If you cannot read certain details clearly, make reasonable estimates
5. Ensure all numeric values are properly formatted
6. Include reference numbers, cheque numbers, or transaction IDs when visible
7. Return ONLY the JSON object, no additional text`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 4096,
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API request failed: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiResult = await geminiResponse.json();
      console.log('Gemini API response:', JSON.stringify(geminiResult, null, 2));

      const generatedText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        console.error('No text generated from Gemini API');
        throw new Error('No text generated from Gemini API');
      }

      console.log('Generated text from Gemini:', generatedText);

      // Extract JSON from the generated text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in Gemini response:', generatedText);
        throw new Error('No valid JSON found in Gemini response');
      }

      try {
        extractedTransactions = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed extracted transactions:', extractedTransactions);
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini:', parseError);
        console.error('Raw JSON string:', jsonMatch[0]);
        throw new Error(`Invalid JSON from Gemini API: ${parseError.message}`);
      }
    } else {
      // Fallback sample data only if no image is provided
      console.log('No image provided, using sample data');
      extractedTransactions = {
        accountNumber: "SAMPLE1234",
        bankName: "Sample Bank",
        statementPeriod: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        openingBalance: "50000.00",
        closingBalance: "45000.00",
        transactions: [
          {
            date: new Date().toISOString().split('T')[0],
            description: "SAMPLE - HP PETROL PUMP MUMBAI",
            debitAmount: 2500.00,
            creditAmount: 0,
            balance: 47500.00,
            referenceNumber: "SAMPLE123456",
            category: "fuel_expense"
          },
          {
            date: new Date().toISOString().split('T')[0],
            description: "SAMPLE - OFFICE RENT PAYMENT",
            debitAmount: 25000.00,
            creditAmount: 0,
            balance: 22500.00,
            referenceNumber: "SAMPLE789012",
            category: "rent_expense"
          }
        ]
      };
    }

    // Validate and clean the extracted data
    if (!extractedTransactions.transactions || !Array.isArray(extractedTransactions.transactions)) {
      extractedTransactions.transactions = [];
    }

    // Ensure all transactions have required fields and proper data types
    extractedTransactions.transactions = extractedTransactions.transactions.map((transaction: any, index: number) => {
      const cleanTransaction = {
        date: transaction.date || new Date().toISOString().split('T')[0],
        description: String(transaction.description || `Transaction ${index + 1}`),
        debitAmount: parseFloat(String(transaction.debitAmount || 0)) || 0,
        creditAmount: parseFloat(String(transaction.creditAmount || 0)) || 0,
        balance: parseFloat(String(transaction.balance || 0)) || 0,
        referenceNumber: String(transaction.referenceNumber || ''),
        category: transaction.category || 'other'
      };
      
      // Ensure only one of debit or credit is non-zero
      if (cleanTransaction.debitAmount > 0) {
        cleanTransaction.creditAmount = 0;
      } else if (cleanTransaction.creditAmount > 0) {
        cleanTransaction.debitAmount = 0;
      }
      
      return cleanTransaction;
    });

    // Validate required fields
    extractedTransactions.accountNumber = extractedTransactions.accountNumber || 'UNKNOWN';
    extractedTransactions.bankName = extractedTransactions.bankName || 'Unknown Bank';
    extractedTransactions.openingBalance = String(extractedTransactions.openingBalance || '0');
    extractedTransactions.closingBalance = String(extractedTransactions.closingBalance || '0');
    
    if (!extractedTransactions.statementPeriod) {
      extractedTransactions.statementPeriod = {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      };
    }

    console.log('Final processed transactions:', extractedTransactions);

    return new Response(JSON.stringify({ 
      success: true, 
      extractedData: extractedTransactions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-bank-statement-ai function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});