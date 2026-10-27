import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Coffee, Pause, Play, RotateCcw, Timer, Volume2, VolumeX, X } from 'lucide-react'
import type { Task } from '../types'

interface WorkbenchValue {
  focus: (task: Task, complete: () => Promise<unknown> | void) => void
  pendingIds: string[]
  remove: (task: Task, commit: () => Promise<void> | void) => void
}

const WorkbenchContext = createContext<WorkbenchValue | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ task: Task; complete: () => Promise<unknown> | void } | null>(null)
  const [phase, setPhase] = useState<'focus' | 'break'>('focus')
  const [remaining, setRemaining] = useState(1500)
  const [running, setRunning] = useState(false)
  const [sound, setSound] = useState(false)
  const [notice, setNotice] = useState('')
  const [completing, setCompleting] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const pending = useRef(new Map<string, { task: Task; timer: number }>())
  const deadline = useRef(0)
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setRemaining(next)
      if (next > 0) return
      setRunning(false)
      setNotice(phase === 'focus' ? 'Focus session complete. Time for a break.' : 'Break complete.')
      setPhase(phase === 'focus' ? 'break' : 'focus')
      setRemaining(phase === 'focus' ? 300 : 1500)
      if (sound && audio.current) {
        const oscillator = audio.current.createOscillator()
        const gain = audio.current.createGain()
        oscillator.connect(gain)
        gain.connect(audio.current.destination)
        gain.gain.setValueAtTime(0.12, audio.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.7)
        oscillator.frequency.value = 660
        oscillator.start()
        oscillator.stop(audio.current.currentTime + 0.7)
      }
    }
    const interval = window.setInterval(tick, 250)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running, phase, sound])

  return (
    <WorkbenchContext.Provider value={{
      pendingIds,
      focus: (task, complete) => {
        setSession({ task, complete })
        setPhase('focus')
        setRemaining(1500)
        deadline.current = Date.now() + 1500000
        setRunning(true)
        setNotice('')
      },
      remove: (task, commit) => {
        if (pending.current.has(task.id)) return
        if (session?.task.id === task.id) { setSession(null); setRunning(false) }
        const timer = window.setTimeout(async () => {
          try { await commit(); window.dispatchEvent(new Event('flowy-tasks-changed')) }
          finally {
            pending.current.delete(task.id)
            setPendingIds([...pending.current.keys()])
          }
        }, 6000)
        pending.current.set(task.id, { task, timer })
        setPendingIds([...pending.current.keys()])
      },
    }}>
      {children}
      {session && (
        <section className="focus-strip" aria-label="Current focus">
          <span className="focus-strip-icon">{phase === 'focus' ? <Timer size={20} /> : <Coffee size={20} />}</span>
          <div className="focus-strip-title"><small>{phase === 'focus' ? 'Current focus' : 'Short break'}</small><strong>{session.task.title}</strong></div>
          <output className="focus-clock" aria-label="Time remaining">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</output>
          <button className="icon-btn" onClick={() => {
            if (!running) deadline.current = Date.now() + remaining * 1000
            setRunning(!running)
            setNotice('')
          }} title={running ? 'Pause timer' : 'Start timer'} aria-label={running ? 'Pause timer' : 'Start timer'}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
          <button className="icon-btn" onClick={() => { setRunning(false); setRemaining(phase === 'focus' ? 1500 : 300) }} title="Reset timer" aria-label="Reset timer"><RotateCcw size={16} /></button>
          <button className="icon-btn" aria-label={sound ? 'Mute completion sound' : 'Enable completion sound'} title={sound ? 'Mute completion sound' : 'Enable completion sound'} aria-pressed={sound} onClick={() => {
            if (!sound) {
              audio.current ??= new AudioContext()
              void audio.current.resume()
            }
            setSound(!sound)
          }}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button className="btn-primary" disabled={completing} onClick={async () => {
            setCompleting(true)
            try {
              const succeeded = await session.complete()
              if (succeeded === false) throw new Error('Save failed')
              window.dispatchEvent(new Event('flowy-tasks-changed'))
              setSession(null)
              setRunning(false)
            }
            catch { setNotice('Could not complete task. Please try again.') }
            finally { setCompleting(false) }
          }}><Check size={16} /> {completing ? 'Saving…' : 'Complete'}</button>
          <button className="icon-btn" title="End focus session" aria-label="End focus session" onClick={() => { setSession(null); setRunning(false) }}><X size={17} /></button>
          {notice && <span className="focus-notice" role="status">{notice}</span>}
        </section>
      )}
      <div className="toast-stack" aria-live="polite">
        {pendingIds.map((id) => <div className="undo-toast" key={id}><span>Deleted “{pending.current.get(id)?.task.title}”</span><button onClick={() => {
          const item = pending.current.get(id)
          if (item) window.clearTimeout(item.timer)
          pending.current.delete(id)
          setPendingIds([...pending.current.keys()])
        }}>Undo</button></div>)}
      </div>
    </WorkbenchContext.Provider>
  )
}

export function useWorkbench() {
  const context = useContext(WorkbenchContext)
  if (!context) throw new Error('WorkbenchProvider is missing')
  return context
}