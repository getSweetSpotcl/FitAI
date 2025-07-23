import { SignUp } from '@clerk/nextjs';

// Force dynamic rendering for Clerk components
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Crea tu cuenta</h1>
          <p className="text-gray-400">Únete a FitAI y transforma tu entrenamiento</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary:
                'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
              card: 'bg-gray-800 shadow-xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-300',
              socialButtonsBlockButton:
                'bg-gray-700 hover:bg-gray-600 text-white border-gray-600',
              formFieldLabel: 'text-gray-300',
              formFieldInput:
                'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
              footerActionLink: 'text-blue-400 hover:text-blue-300',
              identityPreviewText: 'text-gray-300',
              identityPreviewEditButtonIcon: 'text-gray-300',
            },
            layout: {
              socialButtonsPlacement: 'top',
              socialButtonsVariant: 'blockButton',
            },
          }}
          redirectUrl="/dashboard"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}