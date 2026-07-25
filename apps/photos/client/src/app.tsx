import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'
import { RollProvider } from './hooks/useRoll'
import { ToastProvider } from './hooks/useToast'
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
      <div className="min-h-screen bg-darkroom text-paper font-body">
        <div className="grid md:grid-cols-2 min-h-screen">
          <QRCodePanel />
          <div className="flex items-center justify-center px-4">
            <div className="font-mono-stamp text-[11px] tracking-[0.18em] uppercase text-paper-dim">
              Developing…
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-darkroom text-paper font-body">
        <div className="grid md:grid-cols-2 min-h-screen">
          <QRCodePanel />
          <div className="flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">⚠️</div>
              <h1 className="font-display text-3xl font-bold mb-4 uppercase">Light leak</h1>
              <p className="text-paper-dim">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main layout with routes
  return (
    <div className="min-h-screen bg-darkroom text-paper font-body">
      <div className="leak" />
      <div className="grid md:grid-cols-2 min-h-screen">
        <QRCodePanel />
        <div className="flex flex-col relative z-[2]">
          <main className="w-full max-w-[430px] mx-auto flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <div className="grain" />

      {/* Onboarding modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-film-2 border border-paper/12 rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="font-display text-2xl font-bold uppercase mb-4">End of roll</h2>
            <p className="text-paper-dim">{resetMessage}</p>
            <button
              onClick={() => setResetMessage(null)}
              className="mt-6 px-6 py-2 btn-primary"
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
      <RollProvider>
        <ToastProvider>
          <Layout />
        </ToastProvider>
      </RollProvider>
    </AuthProvider>
  )
}
