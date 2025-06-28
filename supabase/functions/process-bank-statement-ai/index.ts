import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
        throw new Error('Gemini API key not configured');
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
                text: `Extract bank transactions from this bank statement image and return them as a JSON object with the following structure:
                {
                  "accountNumber": "account number if visible",
                  "bankName": "bank name if visible",
                  "statementPeriod": {
                    "from": "YYYY-MM-DD",
                    "to": "YYYY-MM-DD"
                  },
                  "openingBalance": "opening balance amount",
                  "closingBalance": "closing balance amount",
                  "transactions": [
                    {
                      "date": "YYYY-MM-DD",
                      "description": "transaction description",
                      "debitAmount": "debit amount or 0",
                      "creditAmount": "credit amount or 0",
                      "balance": "running balance",
                      "referenceNumber": "reference/cheque number if available",
                      "category": "auto-categorize as: travel_expense, fuel_expense, office_expense, construction_expense, material_expense, salary_expense, rent_expense, utilities_expense, professional_fees, marketing_expense, maintenance_expense, insurance_expense, sales_income, service_income, other_income, cgst_payable, sgst_payable, igst_payable, cgst_receivable, sgst_receivable, igst_receivable, accounts_payable, accounts_receivable, cash, bank, or other"
                    }
                  ]
                }
                
                Rules:
                1. Extract ALL visible transactions from the statement
                2. Categorize transactions intelligently based on description
                3. Use 0 for debit/credit amounts when the transaction is on the opposite side
                4. Include reference numbers, cheque numbers, or transaction IDs when visible
                5. If dates are unclear, use reasonable estimates within the statement period
                6. For amounts, extract only numeric values without currency symbols`
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
        console.error('Gemini API error:', await geminiResponse.text());
        throw new Error('Failed to process bank statement with Gemini API');
      }

      const geminiResult = await geminiResponse.json();
      console.log('Gemini API response:', geminiResult);

      const generatedText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No text generated from Gemini API');
      }

      // Extract JSON from the generated text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      try {
        extractedTransactions = JSON.parse(jsonMatch[0]);
        console.log('Extracted transactions from Gemini:', extractedTransactions);
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini:', parseError);
        throw new Error('Invalid JSON from Gemini API');
      }
    } else {
      // Use sample data if no image provided
      extractedTransactions = {
        accountNumber: "XXXX1234",
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
            description: "HP PETROL PUMP MUMBAI",
            debitAmount: "2500.00",
            creditAmount: "0",
            balance: "47500.00",
            referenceNumber: "TXN123456",
            category: "fuel_expense"
          },
          {
            date: new Date().toISOString().split('T')[0],
            description: "OFFICE RENT PAYMENT",
            debitAmount: "25000.00",
            creditAmount: "0",
            balance: "22500.00",
            referenceNumber: "CHQ789012",
            category: "rent_expense"
          },
          {
            date: new Date().toISOString().split('T')[0],
            description: "CLIENT PAYMENT RECEIVED",
            debitAmount: "0",
            creditAmount: "50000.00",
            balance: "72500.00",
            referenceNumber: "NEFT345678",
            category: "sales_income"
          },
          {
            date: new Date().toISOString().split('T')[0],
            description: "ELECTRICITY BILL MSEB",
            debitAmount: "3500.00",
            creditAmount: "0",
            balance: "69000.00",
            referenceNumber: "AUTO901234",
            category: "utilities_expense"
          },
          {
            date: new Date().toISOString().split('T')[0],
            description: "CONSTRUCTION MATERIAL PURCHASE",
            debitAmount: "15000.00",
            creditAmount: "0",
            balance: "54000.00",
            referenceNumber: "CHQ567890",
            category: "construction_expense"
          }
        ]
      };
    }

    // Validate and clean the extracted data
    if (!extractedTransactions.transactions || !Array.isArray(extractedTransactions.transactions)) {
      extractedTransactions.transactions = [];
    }

    // Ensure all transactions have required fields
    extractedTransactions.transactions = extractedTransactions.transactions.map((transaction: any) => ({
      date: transaction.date || new Date().toISOString().split('T')[0],
      description: transaction.description || 'Unknown Transaction',
      debitAmount: parseFloat(transaction.debitAmount) || 0,
      creditAmount: parseFloat(transaction.creditAmount) || 0,
      balance: parseFloat(transaction.balance) || 0,
      referenceNumber: transaction.referenceNumber || '',
      category: transaction.category || 'other'
    }));

    console.log('Final extracted transactions:', extractedTransactions);

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
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});