'use client';

import React, { useState } from 'react';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}

interface DashboardClientProps {
  userData: UserData;
}

export default function DashboardClient({ userData }: DashboardClientProps) {
  const [viewMode, setViewMode] = useState<'admin' | 'user'>(userData.isAdmin ? 'admin' : 'user');
  
  const getFullName = () => {
    const fullName = `${userData.firstName} ${userData.lastName}`.trim();
    return fullName || userData.email || 'Usuario';
  };

  const AdminDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Dashboard FitAI</h1>
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm">
              👑 Admin
            </span>
            {userData.isAdmin && (
              <button
                onClick={() => setViewMode('user')}
                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-500 bg-opacity-20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                👤 Ver como Usuario
              </button>
            )}
          </div>
          <p className="text-gray-400">
            Panel de administración para gestionar la aplicación FitAI
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Administrador:</p>
          <p className="text-white font-medium">{getFullName()}</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Usuarios Totales</p>
              <p className="text-2xl font-bold text-white">1,234</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Entrenamientos Hoy</p>
              <p className="text-2xl font-bold text-white">89</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Rutinas IA</p>
              <p className="text-2xl font-bold text-white">56</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Ingresos Mes</p>
              <p className="text-2xl font-bold text-white">$45,230</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usuarios activos */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Usuarios Activos (7 días)</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Gráfico de usuarios activos</p>
              <p className="text-sm text-gray-500">(Conectar con API de analytics)</p>
            </div>
          </div>
        </div>

        {/* Entrenamientos por día */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Entrenamientos por Día</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p>Gráfico de entrenamientos</p>
              <p className="text-sm text-gray-500">(Conectar con API de workouts)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {[
            { user: "Juan Pérez", action: "Completó rutina 'Fuerza Básica'", time: "Hace 5 min" },
            { user: "María González", action: "Se suscribió a Premium", time: "Hace 12 min" },
            { user: "Carlos Silva", action: "Generó rutina con IA", time: "Hace 18 min" },
            { user: "Ana Torres", action: "Actualizó su perfil", time: "Hace 25 min" },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
              <div>
                <p className="text-white font-medium">{activity.user}</p>
                <p className="text-gray-400 text-sm">{activity.action}</p>
              </div>
              <p className="text-gray-500 text-sm">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const UserDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">¡Bienvenido de vuelta!</h1>
            {userData.isAdmin && (
              <button
                onClick={() => setViewMode('admin')}
                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-500 bg-opacity-20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                👑 Ver como Admin
              </button>
            )}
          </div>
          <p className="text-gray-400">
            Continúa tu viaje fitness con FitAI
          </p>
        </div>
      </div>

      {/* Stats personales del usuario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Entrenamientos Completados</p>
              <p className="text-2xl font-bold text-white">12</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Rutinas IA Generadas</p>
              <p className="text-2xl font-bold text-white">3</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-500 bg-opacity-20 rounded-lg">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Tiempo Total</p>
              <p className="text-2xl font-bold text-white">8h 45m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Entrenar Hoy</h3>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-2">Rutina Sugerida</h4>
              <p className="text-orange-100 text-sm mb-3">Entrenamiento de Fuerza - Tren Superior</p>
              <button className="bg-white text-orange-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
                ▶️ Comenzar Entrenamiento
              </button>
            </div>
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              🤖 Generar Rutina con IA
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Progreso Semanal</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Meta Semanal</span>
                <span className="text-gray-300">3/5 entrenamientos</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{width: '60%'}}></div>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-gray-400 text-sm">¡Vas muy bien! Solo te faltan 2 entrenamientos para completar tu meta semanal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial reciente */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Tu Actividad Reciente</h3>
        <div className="space-y-4">
          {[
            { workout: "Rutina de Fuerza", date: "Hace 2 días", duration: "45 min", status: "completed" },
            { workout: "Cardio HIIT", date: "Hace 4 días", duration: "30 min", status: "completed" },
            { workout: "Entrenamiento Funcional", date: "Hace 1 semana", duration: "50 min", status: "completed" },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
              <div className="flex items-center">
                <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg mr-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{activity.workout}</p>
                  <p className="text-gray-400 text-sm">{activity.date} • {activity.duration}</p>
                </div>
              </div>
              <span className="text-green-400 text-sm font-medium">Completado ✓</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA para descargar app */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-lg font-semibold mb-2">¡Lleva FitAI contigo!</h3>
            <p className="text-purple-100 text-sm">Descarga nuestra app móvil para entrenar desde cualquier lugar</p>
          </div>
          <button className="bg-white text-purple-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors">
            📱 Descargar App
          </button>
        </div>
      </div>
    </div>
  );

  // Solo mostrar dashboard de admin si es admin Y está en modo admin
  // Si no es admin, siempre mostrar dashboard de usuario
  return viewMode === 'admin' && userData.isAdmin ? <AdminDashboard /> : <UserDashboard />;
}