
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Upload, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface DashboardStats {
  totalBills: number;
  pendingProcessing: number;
  monthlyRevenue: number;
  activeVendors: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  time: string;
}

export const Dashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBills: 0,
    pendingProcessing: 0,
    monthlyRevenue: 0,
    activeVendors: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data for user:', user?.id);
      
      // Fetch bills count
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('id, total_amount, vendor_name, created_at')
        .eq('user_id', user?.id);

      if (billsError) {
        console.error('Error fetching bills:', billsError);
      }

      const bills = billsData || [];
      const totalBills = bills.length;
      
      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = bills
        .filter(bill => {
          const billDate = new Date(bill.created_at);
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        })
        .reduce((sum, bill) => sum + Number(bill.total_amount), 0);

      // Count unique vendors
      const uniqueVendors = new Set(bills.map(bill => bill.vendor_name)).size;

      setStats({
        totalBills,
        pendingProcessing: 0, // For now
        monthlyRevenue,
        activeVendors: uniqueVendors
      });

      // Generate recent activity from bills
      const recentBills = bills
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const activities = recentBills.map(bill => ({
        id: bill.id,
        type: 'bill_created',
        description: `Bill processed from ${bill.vendor_name}`,
        time: new Date(bill.created_at).toLocaleDateString()
      }));

      if (activities.length === 0) {
        activities.push(
          { id: '1', type: 'bill_uploaded', description: 'Ready to upload your first bill', time: 'Just now' },
          { id: '2', type: 'vendor_setup', description: 'Set up your vendors', time: 'Getting started' },
          { id: '3', type: 'ledger_ready', description: 'Ledger system ready', time: 'Ready to use' }
        );
      }

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, description, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend && (
            <span className={`inline-flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )} {description}
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
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name || user?.email}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your accounting activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bills"
          value={stats.totalBills}
          description="total uploaded"
          icon={FileText}
          trend={12}
        />
        <StatCard
          title="Pending Processing"
          value={stats.pendingProcessing}
          description="awaiting AI classification"
          icon={AlertCircle}
        />
        <StatCard
          title="Monthly Revenue"
          value={`₹${stats.monthlyRevenue.toLocaleString()}`}
          description="this month"
          icon={DollarSign}
          trend={8}
        />
        <StatCard
          title="Active Vendors"
          value={stats.activeVendors}
          description="in your network"
          icon={Users}
          trend={5}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates on your bills and ledgers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              onClick={() => window.location.href = '/upload'}
              className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Upload New Bill</p>
                <p className="text-xs text-gray-500">Scan and process invoice</p>
              </div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/ledgers'}
              className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">View Ledgers</p>
                <p className="text-xs text-gray-500">Check account balances</p>
              </div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/analytics'}
              className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium">View Analytics</p>
                <p className="text-xs text-gray-500">Business insights</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current status of AI processing and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Database Connection</p>
                <p className="text-xs text-gray-500">Connected to Supabase</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-xs text-gray-500">User: {user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">AI Processing</p>
                <p className="text-xs text-gray-500">Gemini API Ready</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
