import { useReplayStore, formatTimeLong } from '@/stores/replayStore'

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8]

export function ReplayControls() {
  const {
    currentTime,
    duration,
    isPlaying,
    speed,
    toggle,
    setSpeed,
    skip,
    seekToPercent
  } = useReplayStore()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekToPercent(parseFloat(e.target.value) / 100)
  }

  return (
    <div className="glass-panel p-3 min-w-[400px]">
      {/* Timeline */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleTimelineChange}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-f1-red
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125"
        />
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{formatTimeLong(currentTime)}</span>
          <span>{formatTimeLong(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Rewind */}
        <button
          onClick={() => skip(-10)}
          className="control-btn"
          title="Voltar 10s"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={toggle}
          className="control-btn w-12 h-12 bg-f1-red hover:bg-red-600"
          title={isPlaying ? 'Pausar' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Forward */}
        <button
          onClick={() => skip(10)}
          className="control-btn"
          title="Avançar 10s"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
          </svg>
        </button>

        {/* Speed selector */}
        <div className="ml-4 flex items-center gap-2">
          <span className="text-xs text-white/60">Velocidade:</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/10 cursor-pointer
              focus:outline-none focus:border-f1-red"
          >
            {SPEEDS.map(s => (
              <option key={s} value={s} className="bg-f1-dark text-white">
                {s}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
