import { useEffect, useId, useRef, useState } from 'react'
import { Music2, Pause, Play, RotateCcw } from 'lucide-react'

const FOCUS_SECONDS = 25 * 60
const TRACKS = [
  { id: 'lock-in', title: 'lock in', src: '/lock_in.mp3' },
  { id: 'study-music-alpha-waves', title: 'Study music: alpha waves', src: '/study-music-alpha-waves.m4a' },
] as const

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

function formatTrackTime(total: number) {
  if (!Number.isFinite(total)) return '0:00'
  return `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`
}

/** A small, artistic tomato mark drawn in SVG. */
function Tomato({ size = 20, active = false }: { size?: number; active?: boolean }) {
  const gradientId = useId()
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
        <radialGradient id={gradientId} cx="38%" cy="34%" r="72%">
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
        fill={`url(#${gradientId})`}
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
  const [selectedTrackId, setSelectedTrackId] = useState<string>(TRACKS[0].id)
  const [trackTime, setTrackTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(0)
  const [audioError, setAudioError] = useState('')
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const deadlineRef = useRef(0)
  const selectedTrack = TRACKS.find((track) => track.id === selectedTrackId) ?? TRACKS[0]

  useEffect(() => {
    if (!running) return
    const sync = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      if (remaining === 0) { setRunning(false); setSecondsLeft(FOCUS_SECONDS) }
      else setSecondsLeft(remaining)
    }
    intervalRef.current = window.setInterval(sync, 1000)
    const onVisible = () => { if (!document.hidden) sync() }
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
  }, [running])

  useEffect(() => {
    onRunningChange?.(running)
  }, [running, onRunningChange])

  useEffect(() => {
    if (!running) return
    const previous = document.title
    document.title = `${format(secondsLeft)} | Focus`
    return () => { document.title = previous }
  }, [running, secondsLeft])

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current?.load()
    setTrackPlaying(false)
    setTrackTime(0)
    setTrackDuration(0)
    setAudioError('')
  }, [selectedTrackId])

  const progress = 1 - secondsLeft / FOCUS_SECONDS
  const R = 13
  const circ = 2 * Math.PI * R

  const toggle = () => {
    if (!running) deadlineRef.current = Date.now() + secondsLeft * 1000
    setRunning(!running)
  }
  const reset = () => {
    setRunning(false)
    setSecondsLeft(FOCUS_SECONDS)
  }

  const toggleTrack = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) { audio.pause(); return }
    try { await audio.play(); setAudioError('') }
    catch { setAudioError('Could not play music. Try again.') }
  }
  const seekTrack = (nextTime: number) => {
    const audio = audioRef.current
    if (!audio || !trackDuration) return
    audio.currentTime = Math.max(0, Math.min(nextTime, trackDuration))
    setTrackTime(audio.currentTime)
  }

  return (
    <div className={`pomodoro-stack ${collapsed ? 'is-collapsed' : ''}`}>
      <audio ref={audioRef} src={selectedTrack.src} preload="metadata" onLoadedMetadata={(event) => setTrackDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setTrackTime(event.currentTarget.currentTime)} onPlay={() => setTrackPlaying(true)} onPause={() => setTrackPlaying(false)} onEnded={() => { setTrackPlaying(false); setTrackTime(0) }} onError={() => setAudioError('Could not load music. Try another track.')} />
      <div className="lock-in-player">
        <div className="lock-in-head"><Music2 size={16} /><div className="lock-in-copy"><span className="lock-in-label">Music</span><select className="lock-in-select" aria-label="Choose music" value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)}>{TRACKS.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select></div></div>
        <div className="lock-in-controls">
          <button className="lock-in-btn" type="button" onClick={() => seekTrack(trackTime - 15)} aria-label="Skip music back 15 seconds" title="Back 15 seconds">-15</button>
          <button className="lock-in-play" type="button" onClick={toggleTrack} aria-label={trackPlaying ? 'Pause music' : 'Play music'} title={trackPlaying ? 'Pause music' : 'Play music'}>{trackPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
          <button className="lock-in-btn" type="button" onClick={() => seekTrack(trackTime + 15)} aria-label="Skip music forward 15 seconds" title="Forward 15 seconds">+15</button>
        </div>
        <div className="lock-in-timeline"><span>{formatTrackTime(trackTime)}</span><input type="range" min="0" max={trackDuration || 0} step="0.1" value={Math.min(trackTime, trackDuration || trackTime)} disabled={!trackDuration} onChange={(event) => seekTrack(Number(event.target.value))} aria-label="Music timeline" /><span>{formatTrackTime(trackDuration)}</span></div>
        {audioError && <p className="music-error" role="status">{audioError}</p>}
      </div>
      <div className="pomodoro-compact">
      <button
        className={`pomodoro-mini ${running ? 'is-running' : ''}`}
        onClick={toggle}
        title={running ? `Focus ${format(secondsLeft)} — pause` : 'Start focus timer'}
        aria-label={running ? 'Pause Pomodoro' : 'Start Pomodoro'}
      >
        <Tomato size={22} active={running} />
      </button>
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
        <span className="pomodoro-label">Pomodoro</span>
      </div>

      <div className="pomodoro-actions">
        <button className="pomodoro-btn" onClick={toggle} aria-label={running ? 'Pause Pomodoro' : 'Start Pomodoro'} title={running ? 'Pause Pomodoro' : 'Start Pomodoro'}>
          {running ? <Pause size={13} /> : <Play size={13} />}
        </button>
        {secondsLeft !== FOCUS_SECONDS && (
          <button className="pomodoro-btn ghost" onClick={reset} aria-label="Reset Pomodoro" title="Reset Pomodoro">
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
    </div>
  )
}
