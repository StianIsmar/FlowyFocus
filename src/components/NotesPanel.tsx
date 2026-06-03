import { useEffect, useRef, useState } from 'react'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../types'

interface Props {
  groupId: string
  accent: string
}

export default function NotesPanel({ groupId, accent }: Props) {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes(groupId)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && notes.length) setSelectedId(notes[0].id)
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null)
    }
  }, [notes, selectedId])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  const handleCreate = async () => {
    const note = await createNote()
    if (note) setSelectedId(note.id)
  }

  return (
    <div className="notes" style={{ ['--accent' as string]: accent }}>
      <div className="notes-list">
        <button className="btn-primary block" onClick={handleCreate}>
          + New note
        </button>
        {loading && notes.length === 0 && <div className="muted small pad">Loading…</div>}
        {notes.map((n) => (
          <button
            key={n.id}
            className={`note-card ${n.id === selectedId ? 'sel' : ''}`}
            onClick={() => setSelectedId(n.id)}
          >
            <span className="note-card-title">{n.title || 'Untitled'}</span>
            <span className="note-card-preview">
              {n.content.slice(0, 60) || 'Empty note'}
            </span>
          </button>
        ))}
        {!loading && notes.length === 0 && (
          <p className="muted small pad">No notes in this group yet.</p>
        )}
      </div>

      <div className="note-editor">
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            onSave={updateNote}
            onDelete={deleteNote}
          />
        ) : (
          <div className="muted pad">Select or create a note.</div>
        )}
      </div>
    </div>
  )
}

function NoteEditor({
  note,
  onSave,
  onDelete,
}: {
  note: Note
  onSave: (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const timer = useRef<number>()

  // Debounced autosave.
  useEffect(() => {
    if (title === note.title && content === note.content) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onSave(note.id, { title, content })
    }, 600)
    return () => window.clearTimeout(timer.current)
  }, [title, content, note.id, note.title, note.content, onSave])

  return (
    <div className="note-edit-inner">
      <div className="note-edit-head">
        <input
          className="note-title-input"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <button
          className="link-btn danger"
          onClick={() => {
            if (confirm('Delete this note?')) onDelete(note.id)
          }}
        >
          Delete
        </button>
      </div>
      <textarea
        className="note-content-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing…"
      />
      <div className="note-meta muted small">
        Saved {new Date(note.updated_at).toLocaleString()}
      </div>
    </div>
  )
}
