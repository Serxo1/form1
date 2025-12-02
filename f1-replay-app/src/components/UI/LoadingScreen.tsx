import { useRaceStore } from '@/stores/raceStore'

export function LoadingScreen() {
  const { loadingProgress, loadingStatus, error } = useRaceStore()

  return (
    <div className="fixed inset-0 bg-f1-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
          <div
            className="absolute inset-0 border-4 border-transparent border-t-f1-red rounded-full animate-spin"
          ></div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          Carregando Corrida
        </h2>

        {/* Status */}
        <p className="text-white/60 mb-4">
          {error || loadingStatus || 'Inicializando...'}
        </p>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
          <div
            className="h-full bg-f1-red rounded-full transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        {/* Percentage */}
        <p className="text-white/40 text-sm mt-2">
          {Math.round(loadingProgress)}%
        </p>

        {/* Error state */}
        {error && (
          <div className="mt-6">
            <button
              onClick={() => useRaceStore.getState().loadDemoData()}
              className="px-4 py-2 bg-f1-red text-white rounded hover:bg-red-600 transition-colors"
            >
              Carregar Demo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
