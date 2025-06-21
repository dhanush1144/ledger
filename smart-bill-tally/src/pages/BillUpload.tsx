
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { createBillLedgerEntries } from '@/utils/ledgerUtils';
import { FileUpload } from '@/components/bill/FileUpload';

interface BillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const BillUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [billNumber, setBillNumber] = useState('');
  const [billType, setBillType] = useState('purchase');
  const [billDate, setBillDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [cgst, setCgst] = useState('');
  const [sgst, setSgst] = useState('');
  const [igst, setIgst] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    { name: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const handleDataExtracted = (extractedData: any) => {
    console.log('Extracted data received:', extractedData);
    
    // Populate form fields with extracted data
    setBillNumber(extractedData.billNumber || '');
    setBillDate(extractedData.billDate || '');
    setTotalAmount(extractedData.totalAmount || '');
    setTaxAmount(extractedData.taxAmount || '');
    setCgst(extractedData.cgst || '');
    setSgst(extractedData.sgst || '');
    setIgst(extractedData.igst || '');
    setVendorName(extractedData.vendorName || '');
    setDescription(extractedData.description || '');
    
    // Populate items if available
    if (extractedData.items && extractedData.items.length > 0) {
      const extractedItems = extractedData.items.map((item: any) => ({
        name: item.name || '',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.price) || 0,
        total: parseFloat(item.total) || 0
      }));
      setItems(extractedItems);
    }
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setItems(updatedItems);
  };

  const calculateItemsTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSaveBill = async () => {
    if (!user) return;

    if (!billNumber || !billDate || !vendorName) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in bill number, date, and vendor name.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const billData = {
        user_id: user.id,
        bill_number: billNumber,
        bill_type: billType,
        bill_date: billDate,
        total_amount: parseFloat(totalAmount) || calculateItemsTotal(),
        tax_amount: parseFloat(taxAmount) || 0,
        cgst: parseFloat(cgst) || 0,
        sgst: parseFloat(sgst) || 0,
        igst: parseFloat(igst) || 0,
        vendor_name: vendorName,
        description: description,
      };

      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert(billData)
        .select()
        .single();

      if (billError) {
        throw billError;
      }

      // Save bill items
      if (items.length > 0 && items[0].name) {
        const billItems = items
          .filter(item => item.name.trim())
          .map(item => ({
            bill_id: bill.id,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.total,
          }));

        if (billItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(billItems);

          if (itemsError) {
            console.error('Error saving bill items:', itemsError);
          }
        }
      }

      // Create ledger entries
      await createBillLedgerEntries(bill.id, user.id);

      toast({
        title: 'Bill saved successfully',
        description: 'Your bill has been processed and ledger entries have been created.',
      });

      // Reset form
      setBillNumber('');
      setBillType('purchase');
      setBillDate('');
      setTotalAmount('');
      setTaxAmount('');
      setCgst('');
      setSgst('');
      setIgst('');
      setVendorName('');
      setDescription('');
      setItems([{ name: '', quantity: 1, unitPrice: 0, total: 0 }]);

    } catch (error: any) {
      console.error('Error saving bill:', error);
      toast({
        title: 'Error saving bill',
        description: error.message || 'Failed to save bill data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Bill</h1>
        <p className="text-gray-600">Upload and process your invoices with AI-powered data extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Document Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Upload an image or PDF of your bill for AI processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onDataExtracted={handleDataExtracted} />
          </CardContent>
        </Card>

        {/* Bill Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Information</CardTitle>
            <CardDescription>
              Fill in the bill details manually or let AI extract them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bill-number">Bill Number</Label>
                <Input
                  id="bill-number"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="INV-2024-001"
                />
              </div>
              <div>
                <Label htmlFor="bill-type">Bill Type</Label>
                <Select value={billType} onValueChange={setBillType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bill-date">Bill Date</Label>
                <Input
                  id="bill-date"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="total-amount">Total Amount (₹)</Label>
                <Input
                  id="total-amount"
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-amount">Tax Amount (₹)</Label>
                <Input
                  id="tax-amount"
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="vendor-name">Vendor/Supplier Name</Label>
                <Input
                  id="vendor-name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cgst">CGST (₹)</Label>
                <Input
                  id="cgst"
                  type="number"
                  step="0.01"
                  value={cgst}
                  onChange={(e) => setCgst(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sgst">SGST (₹)</Label>
                <Input
                  id="sgst"
                  type="number"
                  step="0.01"
                  value={sgst}
                  onChange={(e) => setSgst(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="igst">IGST (₹)</Label>
                <Input
                  id="igst"
                  type="number"
                  step="0.01"
                  value={igst}
                  onChange={(e) => setIgst(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes about this bill"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSaveBill} 
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Bill'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bill Items Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
          <CardDescription>
            Add individual items from the bill
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-end">
                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    placeholder="Item name"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Unit Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Total (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.total.toFixed(2)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Item
            </Button>
            
            {items.length > 0 && (
              <div className="text-right pt-4 border-t">
                <p className="text-lg font-semibold">
                  Items Total: ₹{calculateItemsTotal().toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
