
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BillItem {
  name: string;
  quantity: number;
  price: string;
  total: string;
}

interface ExtractedData {
  billNumber: string;
  billType: string;
  billDate: string;
  totalAmount: string;
  taxAmount: string;
  cgst: string;
  sgst: string;
  igst: string;
  description: string;
  vendorName: string;
  items: BillItem[];
}

interface ExtractedBillDataProps {
  extractedData: ExtractedData;
  onDataChange: (data: ExtractedData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ExtractedBillData: React.FC<ExtractedBillDataProps> = ({
  extractedData,
  onDataChange,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ExtractedData>(extractedData);

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

  const handleInputChange = (field: string, value: string | number) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total for the item
    if (field === 'quantity' || field === 'price') {
      const quantity = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
      const price = field === 'price' ? Number(value) : Number(newItems[index].price);
      newItems[index].total = (quantity * price).toString();
    }
    
    setEditData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setEditData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: '', total: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setEditData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>Extracted Bill Data</span>
            </CardTitle>
            <CardDescription>
              Review and edit the AI-extracted information if needed
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
                  Save Bill
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
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="billNumber">Bill Number</Label>
            {isEditing ? (
              <Input
                id="billNumber"
                value={editData.billNumber}
                onChange={(e) => handleInputChange('billNumber', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.billNumber}</div>
            )}
          </div>
          <div>
            <Label htmlFor="billType">Bill Type</Label>
            {isEditing ? (
              <Select value={editData.billType} onValueChange={(value) => handleInputChange('billType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 bg-gray-50 rounded border capitalize">{extractedData.billType}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="billDate">Bill Date</Label>
            {isEditing ? (
              <Input
                id="billDate"
                type="date"
                value={editData.billDate}
                onChange={(e) => handleInputChange('billDate', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">{extractedData.billDate}</div>
            )}
          </div>
          <div>
            <Label htmlFor="totalAmount">Total Amount (₹)</Label>
            {isEditing ? (
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={editData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.totalAmount}</div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="vendorName">Vendor/Supplier Name</Label>
          {isEditing ? (
            <Input
              id="vendorName"
              value={editData.vendorName}
              onChange={(e) => handleInputChange('vendorName', e.target.value)}
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded border">{extractedData.vendorName}</div>
          )}
        </div>

        {/* Tax Information */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cgst">CGST (₹)</Label>
            {isEditing ? (
              <Input
                id="cgst"
                type="number"
                step="0.01"
                value={editData.cgst}
                onChange={(e) => handleInputChange('cgst', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.cgst}</div>
            )}
          </div>
          <div>
            <Label htmlFor="sgst">SGST (₹)</Label>
            {isEditing ? (
              <Input
                id="sgst"
                type="number"
                step="0.01"
                value={editData.sgst}
                onChange={(e) => handleInputChange('sgst', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.sgst}</div>
            )}
          </div>
          <div>
            <Label htmlFor="igst">IGST (₹)</Label>
            {isEditing ? (
              <Input
                id="igst"
                type="number"
                step="0.01"
                value={editData.igst}
                onChange={(e) => handleInputChange('igst', e.target.value)}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border">₹{extractedData.igst}</div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          {isEditing ? (
            <Textarea
              id="description"
              value={editData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded border min-h-[80px]">{extractedData.description}</div>
          )}
        </div>

        {/* Items Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <Label>Bill Items</Label>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price (₹)</TableHead>
                <TableHead>Total (₹)</TableHead>
                {isEditing && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isEditing ? editData.items : extractedData.items).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        min="1"
                        className="w-20"
                      />
                    ) : (
                      item.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        placeholder="0.00"
                        className="w-24"
                      />
                    ) : (
                      `₹${item.price}`
                    )}
                  </TableCell>
                  <TableCell>₹{item.total}</TableCell>
                  {isEditing && (
                    <TableCell>
                      {editData.items.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
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
      </CardContent>
    </Card>
  );
};
