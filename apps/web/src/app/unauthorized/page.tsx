import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <svg className="w-20 h-20 mx-auto text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.36 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="text-4xl font-bold text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-400 text-lg mb-6">
            No tienes permisos para acceder al dashboard de administración.
          </p>
          <p className="text-gray-500 text-sm">
            Esta sección está reservada únicamente para administradores de FitAI.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Ir al Inicio
          </Link>
          <div>
            <Link
              href="/sign-in"
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Cambiar de cuenta
            </Link>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-white font-medium mb-2">¿Eres administrador?</h3>
          <p className="text-gray-400 text-sm">
            Si crees que deberías tener acceso, contacta al equipo de FitAI para que verifiquen tus permisos.
          </p>
        </div>
      </div>
    </div>
  );
}