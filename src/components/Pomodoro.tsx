import { useEffect, useRef, useState } from 'react'

const FOCUS_SECONDS = 25 * 60
const LOCK_IN_AUDIO_SRC = '/lock_in.mp3'

interface Props {
  collapsed?: boolean
  /** Fires whenever the timer starts/stops so the sidebar can tint itself. */
  onRunningChange?: (running: boolean) => void
}

function format(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTrackTime(total: number): string {
  if (!Number.isFinite(total)) return '0:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A small, artistic tomato mark drawn in SVG. */
function Tomato({ size = 20, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg
      className={`tomato ${active ? 'is-active' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="tomatoBody" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ff7a59" />
          <stop offset="55%" stopColor="#f0492f" />
          <stop offset="100%" stopColor="#c4321f" />
        </radialGradient>
      </defs>
      {/* leafy crown */}
      <path
        d="M12 5.4c.9-1.5 2.3-2.2 3.6-2.1-.2 1.2-.9 2.2-2 2.7 1.2-.2 2.3.1 3.1.9-1 .8-2.2 1-3.3.6.5.5.8 1.1.9 1.8-.9-.2-1.7-.7-2.3-1.5-.6.8-1.4 1.3-2.3 1.5.1-.7.4-1.3.9-1.8-1.1.4-2.3.2-3.3-.6.8-.8 1.9-1.1 3.1-.9-1.1-.5-1.8-1.5-2-2.7 1.3-.1 2.7.6 3.6 2.1z"
        fill="#3fae5a"
        fillOpacity={active ? 0.95 : 0.8}
      />
      {/* body */}
      <path
        d="M12 7.2c4 0 6.8 2.8 6.8 6.5 0 3.9-3 6.6-6.8 6.6s-6.8-2.7-6.8-6.6C5.2 10 8 7.2 12 7.2z"
        fill="url(#tomatoBody)"
      />
      {/* subtle highlight */}
      <ellipse cx="9.4" cy="11.4" rx="2" ry="1.3" fill="#ffffff" fillOpacity="0.28" />
    </svg>
  )
}

export default function Pomodoro({ collapsed = false, onRunningChange }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS)
  const [running, setRunning] = useState(false)
  const [trackPlaying, setTrackPlaying] = useState(false)
  const [trackTime, setTrackTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Absolute time (ms) when the current focus session should reach zero. */
  const deadlineRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) {
      deadlineRef.current = null
      return
    }

    // Anchor the countdown to a wall-clock deadline so background throttling
    // can't slow it down — we always derive the remaining time from Date.now().
    deadlineRef.current = Date.now() + secondsLeft * 1000

    const sync = () => {
      const remainingMs = (deadlineRef.current ?? 0) - Date.now()
      const remaining = Math.max(0, Math.round(remainingMs / 1000))
      if (remaining <= 0) {
        setRunning(false)
        setSecondsLeft(FOCUS_SECONDS)
        return
      }
      setSecondsLeft(remaining)
    }

    intervalRef.current = window.setInterval(sync, 1000)
    // Recompute immediately when the tab regains focus (it may have been throttled).
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
    // Intentionally not depending on secondsLeft: the deadline is captured once
    // per start/resume; ticks read from Date.now() instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    onRunningChange?.(running)
  }, [running, onRunningChange])

  // Reflect the live countdown in the browser tab title while focusing.
  useEffect(() => {
    if (!running) return
    const base = document.title
    document.title = `🍅 ${format(secondsLeft)} — Focus`
    return () => {
      document.title = base
    }
  }, [running, secondsLeft])

  const progress = 1 - secondsLeft / FOCUS_SECONDS
  const R = 13
  const circ = 2 * Math.PI * R

  const toggle = () => setRunning((r) => !r)
  const reset = () => {
    setRunning(false)
    setSecondsLeft(FOCUS_SECONDS)
  }

  const toggleTrack = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (trackPlaying) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch {
      setTrackPlaying(false)
    }
  }

  const seekTrack = (nextTime: number) => {
    const audio = audioRef.current
    if (!audio) return
    const next = Math.max(0, Math.min(nextTime, trackDuration || 0))
    audio.currentTime = next
    setTrackTime(next)
  }

  const skipTrack = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    seekTrack(audio.currentTime + seconds)
  }

  if (collapsed) {
    return (
      <button
        className={`pomodoro-mini ${running ? 'is-running' : ''}`}
        onClick={toggle}
        title={running ? `Focus ${format(secondsLeft)} — pause` : 'Start focus timer'}
        aria-label="Pomodoro timer"
      >
        <Tomato size={22} active={running} />
      </button>
    )
  }

  return (
    <div className="pomodoro-stack">
      <div className="lock-in-player">
        <audio
          ref={audioRef}
          src={LOCK_IN_AUDIO_SRC}
          preload="metadata"
          onLoadedMetadata={(e) => setTrackDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setTrackTime(e.currentTarget.currentTime)}
          onPlay={() => setTrackPlaying(true)}
          onPause={() => setTrackPlaying(false)}
          onEnded={() => {
            setTrackPlaying(false)
            setTrackTime(0)
          }}
        />
        <div className="lock-in-head">
          <span className="lock-in-icon" aria-hidden>♪</span>
          <div className="lock-in-copy">
            <span className="lock-in-label">Music</span>
            <span className="lock-in-title">lock in</span>
          </div>
        </div>
        <div className="lock-in-controls">
          <button className="lock-in-btn" type="button" onClick={() => skipTrack(-15)} aria-label="Skip music back 15 seconds">
            -15
          </button>
          <button className="lock-in-play" type="button" onClick={toggleTrack} aria-label={trackPlaying ? 'Pause music' : 'Play music'}>
            {trackPlaying ? '❚❚' : '▶'}
          </button>
          <button className="lock-in-btn" type="button" onClick={() => skipTrack(15)} aria-label="Skip music forward 15 seconds">
            +15
          </button>
        </div>
        <div className="lock-in-timeline">
          <span>{formatTrackTime(trackTime)}</span>
          <input
            type="range"
            min="0"
            max={trackDuration || 0}
            step="0.1"
            value={Math.min(trackTime, trackDuration || trackTime)}
            disabled={!trackDuration}
            onChange={(e) => seekTrack(Number(e.currentTarget.value))}
            aria-label="Music timeline"
          />
          <span>{formatTrackTime(trackDuration)}</span>
        </div>
      </div>

      <div className={`pomodoro ${running ? 'is-running' : ''}`}>
        <div className="pomodoro-ring">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
            <circle cx="16" cy="16" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
            <circle
              cx="16"
              cy="16"
              r={R}
              fill="none"
              stroke="#f0492f"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              transform="rotate(-90 16 16)"
            />
          </svg>
          <span className="pomodoro-tomato">
            <Tomato size={16} active={running} />
          </span>
        </div>

        <div className="pomodoro-meta">
          <span className="pomodoro-time">{format(secondsLeft)}</span>
          <span className="pomodoro-label">Focus</span>
        </div>

        <div className="pomodoro-actions">
          <button className="pomodoro-btn" onClick={toggle} aria-label={running ? 'Pause' : 'Start'}>
            {running ? '❚❚' : '▶'}
          </button>
          {secondsLeft !== FOCUS_SECONDS && (
            <button className="pomodoro-btn ghost" onClick={reset} aria-label="Reset">
              ↺
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
