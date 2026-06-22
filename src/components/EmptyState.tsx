import { useState } from 'react'

interface Props {
  onCreate: (name: string) => Promise<unknown>
  loading: boolean
}

export default function EmptyState({ onCreate, loading }: Props) {
  const [name, setName] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed)
    setName('')
  }

  return (
    <div className="empty-state">
      <div className="empty-card">
        <h2>Make your first group</h2>
        <p className="muted">
          Groups keep one part of your life in focus — like <b>Car</b>, <b>Work</b>, or{' '}
          <b>Surfing</b>. You’ll only ever see one at a time.
        </p>
        <form onSubmit={submit} className="empty-form">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Surfing"
            maxLength={80}
          />
          <button className="btn-primary" disabled={loading || !name.trim()}>
            Create
            <span className="enter-hint" aria-hidden>↵</span>
          </button>
        </form>
      </div>
    </div>
  )
}
