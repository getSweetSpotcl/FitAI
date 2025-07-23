import { auth, currentUser } from '@clerk/nextjs/server';

export default async function DebugAuthPage() {
  const { userId, sessionClaims } = await auth();
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Debug Auth Information</h1>
        
        <div className="space-y-6">
          {/* User ID */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">User ID</h3>
            <pre className="text-green-400 bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {userId || 'No user ID'}
            </pre>
          </div>

          {/* Session Claims */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Session Claims</h3>
            <pre className="text-green-400 bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(sessionClaims, null, 2)}
            </pre>
          </div>

          {/* Public Metadata */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Public Metadata</h3>
            <pre className="text-green-400 bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(user?.publicMetadata, null, 2)}
            </pre>
          </div>

          {/* Private Metadata */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Private Metadata</h3>
            <pre className="text-green-400 bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(user?.privateMetadata, null, 2)}
            </pre>
          </div>

          {/* Role Check */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Role Check</h3>
            <div className="space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Metadata Role:</span>{' '}
                <span className="text-yellow-400">
                  {(sessionClaims?.metadata as any)?.role || user?.publicMetadata?.role || 'No role set'}
                </span>
              </p>
              <p className="text-white">
                <span className="text-gray-400">Is Admin:</span>{' '}
                <span className={`${
                  ((sessionClaims?.metadata as any)?.role === 'admin' || (user?.publicMetadata as any)?.role === 'admin')
                    ? 'text-green-400' : 'text-red-400'
                }`}>
                  {((sessionClaims?.metadata as any)?.role === 'admin' || (user?.publicMetadata as any)?.role === 'admin') 
                    ? 'YES - Can access dashboard' 
                    : 'NO - Cannot access dashboard'
                  }
                </span>
              </p>
            </div>
          </div>

          {/* Full User Object */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Full User Object</h3>
            <pre className="text-green-400 bg-gray-900 p-4 rounded text-sm overflow-x-auto max-h-96">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Dashboard Access
          </a>
        </div>
      </div>
    </div>
  );
}