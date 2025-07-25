import { serverApiRequest } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

export interface UserStats {
  workoutsCompleted: number;
  aiRoutinesGenerated: number;
  totalTime: number; // in minutes
  weeklyGoal: {
    target: number;
    completed: number;
    percentage: number;
  };
  recentWorkouts: Array<{
    id: string;
    name: string;
    date: string;
    duration: number;
    status: 'completed' | 'in_progress' | 'skipped';
  }>;
}

export interface AdminStats {
  activeUsers: number;
  premiumUsers: number;
  proUsers: number;
  totalWorkouts: number;
  dailyActiveUsers: number;
  monthlyRevenue: number;
  aiCost: number;
  aiRequestsToday: number;
  conversionRate: number;
  systemHealth: number;
  
  // Charts data
  userGrowth: Array<{
    date: string;
    users: number;
    premium: number;
    pro: number;
  }>;
  
  workoutTrends: Array<{
    date: string;
    count: number;
  }>;
  
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    timestamp: string;
  }>;
}

export interface DashboardFilters {
  timeframe?: '7d' | '30d' | '90d' | '1y';
  userType?: 'all' | 'free' | 'premium' | 'pro';
}

export class AnalyticsService {
  static async getUserStats(filters?: DashboardFilters): Promise<UserStats> {
    const params = new URLSearchParams();
    if (filters?.timeframe) params.append('timeframe', filters.timeframe);
    
    const endpoint = filters ? 
      `${API_ENDPOINTS.USER_STATS}?${params.toString()}` : 
      API_ENDPOINTS.USER_STATS;
      
    return serverApiRequest<UserStats>(endpoint);
  }

  static async getAdminStats(filters?: DashboardFilters): Promise<AdminStats> {
    const params = new URLSearchParams();
    if (filters?.timeframe) params.append('timeframe', filters.timeframe);
    if (filters?.userType) params.append('userType', filters.userType);
    
    const endpoint = filters ? 
      `${API_ENDPOINTS.ADMIN_STATS}?${params.toString()}` : 
      API_ENDPOINTS.ADMIN_STATS;
      
    return serverApiRequest<AdminStats>(endpoint);
  }

  // Format currency for display
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Format time duration
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  // Format relative time
  static formatRelativeTime(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `Hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
  }
}