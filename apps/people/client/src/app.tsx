import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'
import { QRCodePanel } from './components/QRCodePanel'
import { Footer } from './components/Footer'

function Layout() {
  const {
    loading,
    error,
    isOnboardingModalOpen,
    resetMessage,
    setIsOnboardingModalOpen,
    setResetMessage,
    handleOnboardingComplete,
  } = useLocalFirstAuth()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="grid md:grid-cols-2 min-h-screen">
          <QRCodePanel />
          <div className="flex items-center justify-center px-4">
            <div className="font-brand-mono text-sm text-dim">loading…</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="grid md:grid-cols-2 min-h-screen">
          <QRCodePanel />
          <div className="flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-6">⚠️</div>
              <h1 className="font-display text-2xl font-bold mb-4">Error</h1>
              <p className="text-dim">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main layout with routes
  return (
    <div className="min-h-screen relative z-[1]">
      <div className="grid md:grid-cols-2 min-h-screen">
        <QRCodePanel />
        <div className="flex flex-col">
          <div className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col flex-1">
            <main className="flex-1 flex flex-col">
              <Outlet />
            </main>
            <Footer />
          </div>
        </div>
      </div>

      {/* Onboarding modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setIsOnboardingModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto rounded-2xl shadow-2xl">
            <Onboarding
              skipSocialStep={true}
              onComplete={handleOnboardingComplete}
            />
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div className="relative z-10 card shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="font-display text-xl font-bold mb-4">Admin Reset</h2>
            <p className="text-dim">{resetMessage}</p>
            <button
              onClick={() => setResetMessage(null)}
              className="cta mt-6 !w-auto px-8 !py-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}
