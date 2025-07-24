"use client";

// Force dynamic rendering to avoid SSG issues
export const dynamic = "force-dynamic";

import {
  Activity,
  BarChart3,
  Brain,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

// Mock data - in production this would come from the API
const mockStats = {
  activeUsers: 1247,
  monthlyRevenue: 8950000, // CLP
  aiCost: 245000, // CLP
  conversionRate: 4.2,
  dailyActiveUsers: 328,
  premiumUsers: 89,
  proUsers: 23,
  totalWorkouts: 5643,
  aiRequestsToday: 142,
  systemHealth: 99.8,
};

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  isPositive: boolean;
}

function StatCard({ title, value, change, icon, isPositive }: StatCardProps) {
  return (
    <div className="glass-effect rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl energy-gradient energy-shadow">
          {icon}
        </div>
        <div
          className={`text-sm font-medium px-2 py-1 rounded-lg ${
            isPositive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {change}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ title, description, icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="glass-effect rounded-xl p-4 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-200 text-left group hover:scale-105"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg energy-gradient group-hover:energy-shadow transition-all duration-200">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent hydration mismatch by showing loading state during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading FitAI Admin...</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              FitAI Admin 💪
            </h1>
            <p className="text-gray-400 mt-1">
              Power Mode Dashboard -{" "}
              {currentTime.toLocaleDateString("es-CL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="glass-effect px-4 py-2 rounded-lg border border-gray-700/50">
              <span className="text-sm text-gray-400">Sistema: </span>
              <span className="text-green-400 font-medium">
                {mockStats.systemHealth}% ✨
              </span>
            </div>
            <div className="w-10 h-10 rounded-full energy-gradient flex items-center justify-center energy-shadow">
              <span className="text-white font-bold text-sm">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Usuarios Activos"
          value={mockStats.activeUsers.toLocaleString()}
          change="+12.5%"
          icon={<Users className="w-6 h-6 text-white" />}
          isPositive={true}
        />
        <StatCard
          title="MRR (Mensual)"
          value={formatCurrency(mockStats.monthlyRevenue)}
          change="+8.3%"
          icon={<DollarSign className="w-6 h-6 text-white" />}
          isPositive={true}
        />
        <StatCard
          title="Costo IA"
          value={formatCurrency(mockStats.aiCost)}
          change="-5.2%"
          icon={<Brain className="w-6 h-6 text-white" />}
          isPositive={true}
        />
        <StatCard
          title="Conversión"
          value={`${mockStats.conversionRate}%`}
          change="+0.8%"
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          isPositive={true}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-effect rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-orange-400" />
            Actividad Hoy
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Usuarios Activos</span>
              <span className="text-white font-medium">
                {mockStats.dailyActiveUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Entrenamientos</span>
              <span className="text-white font-medium">
                {mockStats.totalWorkouts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Consultas IA</span>
              <span className="text-white font-medium">
                {mockStats.aiRequestsToday}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-orange-400" />
            Suscripciones
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Free</span>
              <span className="text-white font-medium">
                {mockStats.activeUsers -
                  mockStats.premiumUsers -
                  mockStats.proUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Premium</span>
              <span className="text-orange-400 font-medium">
                {mockStats.premiumUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pro</span>
              <span className="text-purple-400 font-medium">
                {mockStats.proUsers}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-orange-400" />
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <QuickAction
              title="Ver Usuarios"
              description="Gestionar cuentas"
              icon={<Users className="w-4 h-4 text-white" />}
              onClick={() => alert("Navegando a usuarios...")}
            />
            <QuickAction
              title="Monitor IA"
              description="Costos y uso"
              icon={<Brain className="w-4 h-4 text-white" />}
              onClick={() => alert("Abriendo monitor IA...")}
            />
            <QuickAction
              title="Reportes"
              description="Analytics"
              icon={<BarChart3 className="w-4 h-4 text-white" />}
              onClick={() => alert("Generando reportes...")}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="glass-effect rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">API: Operacional</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">
                Base de Datos: Saludable
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">IA: Activa</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Última actualización: {currentTime.toLocaleTimeString("es-CL")}
          </div>
        </div>
      </div>
    </div>
  );
}
