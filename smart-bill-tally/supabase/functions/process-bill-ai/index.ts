
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
    const { billData, imageBase64 } = await req.json();
    console.log('Processing bill with AI:', billData);
    
    let extractedData;

    if (imageBase64) {
      // Process image with Gemini Vision API
      console.log('Processing image with Gemini API...');
      
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
                text: `Extract the following information from this bill/invoice image and return it as a JSON object:
                {
                  "billNumber": "invoice number",
                  "billDate": "YYYY-MM-DD format",
                  "totalAmount": "total amount as string",
                  "taxAmount": "total tax amount",
                  "cgst": "CGST amount if available",
                  "sgst": "SGST amount if available", 
                  "igst": "IGST amount if available",
                  "vendorName": "vendor/supplier name",
                  "description": "brief description",
                  "items": [
                    {
                      "name": "item name",
                      "quantity": number,
                      "price": "unit price as string",
                      "total": "line total as string"
                    }
                  ]
                }
                
                If any field is not available, use reasonable defaults. For dates, use today's date if not found. For amounts, use "0" if not found.`
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
            maxOutputTokens: 2048,
          }
        })
      });

      if (!geminiResponse.ok) {
        console.error('Gemini API error:', await geminiResponse.text());
        throw new Error('Failed to process image with Gemini API');
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
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('Extracted data from Gemini:', extractedData);
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini:', parseError);
        throw new Error('Invalid JSON from Gemini API');
      }
    } else {
      // Use form data if no image provided
      extractedData = {
        billNumber: billData.billNumber || `BILL-${Date.now()}`,
        billDate: billData.billDate || new Date().toISOString().split('T')[0],
        totalAmount: billData.totalAmount || '0.00',
        taxAmount: billData.taxAmount || '0.00',
        cgst: billData.cgst || '0.00',
        sgst: billData.sgst || '0.00',
        igst: billData.igst || '0.00',
        vendorName: billData.vendorName || 'Unknown Vendor',
        description: billData.description || 'Manual entry',
        items: billData.items?.length > 0 ? billData.items : [
          { name: 'Manual Item', quantity: 1, price: '0.00', total: '0.00' }
        ]
      };
    }

    // Ensure all required fields are present
    extractedData.billType = billData.billType || 'purchase';

    console.log('Final extracted data:', extractedData);

    return new Response(JSON.stringify({ 
      success: true, 
      extractedData: extractedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-bill-ai function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
