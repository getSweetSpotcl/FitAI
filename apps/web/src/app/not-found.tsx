import Link from "next/link";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-orange-500 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">
          Página no encontrada
        </h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
