import { PRIORITY_META, type Priority } from '../types'

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const label = `${PRIORITY_META[priority].label} priority`

  return (
    <span className="priority-badge" data-priority={priority} style={{ background: PRIORITY_META[priority].color }} role="img" title={label} aria-label={label} />
  )
}