
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Calendar } from 'lucide-react';

interface MonthlyData {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface VendorData {
  name: string;
  amount: number;
  transactions: number;
}

const chartConfig = {
  sales: { label: 'Sales', color: '#2563eb' },
  purchases: { label: 'Purchases', color: '#dc2626' },
  profit: { label: 'Profit', color: '#16a34a' },
};

export const Analytics = () => {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [vendorData, setVendorData] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      console.log('Fetching analytics data for user:', user?.id);
      
      // Fetch bills data
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .order('bill_date', { ascending: true });

      if (error) {
        console.error('Error fetching bills:', error);
        return;
      }

      // Process monthly data
      const monthlyMap = new Map<string, { sales: number; purchases: number }>();
      
      bills?.forEach(bill => {
        const date = new Date(bill.bill_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { sales: 0, purchases: 0 });
        }
        
        const current = monthlyMap.get(monthKey)!;
        const amount = Number(bill.total_amount);
        
        if (bill.bill_type === 'sales') {
          current.sales += amount;
        } else {
          current.purchases += amount;
        }
      });

      const processedMonthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([key, data]) => {
          const [year, month] = key.split('-');
          const date = new Date(Number(year), Number(month) - 1);
          return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            sales: data.sales,
            purchases: data.purchases,
            profit: data.sales - data.purchases
          };
        })
        .slice(-6); // Last 6 months

      setMonthlyData(processedMonthlyData);

      // Process category data
      const categoryMap = new Map<string, number>();
      bills?.forEach(bill => {
        const amount = Number(bill.total_amount);
        const category = bill.bill_type === 'sales' ? 'Sales' : 'Purchases';
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });

      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
      const processedCategoryData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));

      setCategoryData(processedCategoryData);

      // Process vendor data
      const vendorMap = new Map<string, { amount: number; count: number }>();
      bills?.forEach(bill => {
        const amount = Number(bill.total_amount);
        const vendor = bill.vendor_name;
        
        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, { amount: 0, count: 0 });
        }
        
        const current = vendorMap.get(vendor)!;
        current.amount += amount;
        current.count += 1;
      });

      const processedVendorData: VendorData[] = Array.from(vendorMap.entries())
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          transactions: data.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 vendors

      setVendorData(processedVendorData);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = monthlyData.reduce((sum, item) => sum + item.sales, 0);
  const totalPurchases = monthlyData.reduce((sum, item) => sum + item.purchases, 0);
  const totalProfit = monthlyData.reduce((sum, item) => sum + item.profit, 0);

  const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          <span className={`inline-flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {change}%
          </span>
          {' '}from last period
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial insights and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={totalSales}
          change={12}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Total Purchases"
          value={totalPurchases}
          change={8}
          icon={Receipt}
          trend="up"
        />
        <StatCard
          title="Net Profit"
          value={totalProfit}
          change={15}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Active Vendors"
          value={vendorData.length}
          change={5}
          icon={Users}
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales vs Purchases Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales vs Purchases</CardTitle>
                <CardDescription>Monthly comparison of sales and purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" />
                      <Bar dataKey="purchases" fill="var(--color-purchases)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <CardDescription>Monthly profit analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="var(--color-profit)" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Categories</CardTitle>
              <CardDescription>Breakdown of transactions by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-sm font-bold">₹{category.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors</CardTitle>
              <CardDescription>Vendor-wise transaction analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No vendor data available. Upload bills to see analytics.
                  </div>
                ) : (
                  vendorData.map((vendor, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-gray-500">{vendor.transactions} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{vendor.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total value</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
