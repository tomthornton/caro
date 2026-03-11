'use client'
import type { Quest, QuestState } from '@/lib/quests'
import { getActiveQuest, getAvailableQuests } from '@/lib/quests'

type Props = {
  state: QuestState
  trustMap: Record<string, number>
  onClose: () => void
  onStart: (questId: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  active: '#c9a84c', complete: '#6ab86a', available: 'rgba(245,240,232,0.6)', locked: 'rgba(245,240,232,0.2)',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'In Progress', complete: '✓ Complete', available: 'Available', locked: 'Locked',
}

export default function QuestLog({ state, trustMap, onClose, onStart }: Props) {
  const active    = getActiveQuest(state)
  const available = getAvailableQuests(state, trustMap)
  const completed = state.quests.filter(q => state.completedIds.includes(q.id))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9980, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', background: 'rgba(0,0,0,0.55)',
    }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'linear-gradient(180deg, #0e0c08 0%, #0a0908 100%)',
        border: '1px solid rgba(201,168,76,0.2)', borderBottom: 'none',
        borderRadius: '16px 16px 0 0', padding: '20px 16px 32px',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(201,168,76,0.3)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 16, color: '#c9a84c', letterSpacing: '0.06em' }}>
            Quest Log
          </span>
          <button onPointerDown={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Active quest */}
        {active && (
          <Section title="Active">
            <QuestCard quest={active} showObjectives />
          </Section>
        )}

        {/* Available quests */}
        {available.length > 0 && (
          <Section title="Available">
            {available.map(q => (
              <QuestCard key={q.id} quest={q} onStart={() => onStart(q.id)} />
            ))}
          </Section>
        )}

        {/* No quests */}
        {!active && available.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.3)', fontSize: 13, fontStyle: 'italic', padding: '24px 0' }}>
            Talk to the villagers to find quests.
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <Section title="Completed">
            {completed.map(q => <QuestCard key={q.id} quest={q} />)}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function QuestCard({ quest, showObjectives, onStart }: { quest: Quest; showObjectives?: boolean; onStart?: () => void }) {
  const isComplete = quest.status === 'complete'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '12px 14px',
      opacity: isComplete ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#f5f0e8', flex: 1, marginRight: 8 }}>{quest.title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[quest.status], whiteSpace: 'nowrap', flexShrink: 0 }}>
          {STATUS_LABEL[quest.status]}
        </span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(245,240,232,0.55)', lineHeight: 1.5 }}>{quest.description}</p>

      {/* Objectives */}
      {showObjectives && (
        <div style={{ marginBottom: 8 }}>
          {quest.objectives.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: o.complete ? '#6ab86a' : 'rgba(245,240,232,0.3)' }}>
                {o.complete ? '✓' : '○'}
              </span>
              <span style={{ fontSize: 11, color: o.complete ? 'rgba(245,240,232,0.3)' : 'rgba(245,240,232,0.6)', textDecoration: o.complete ? 'line-through' : 'none' }}>
                {o.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Reward */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {quest.reward.gold && (
          <span style={{ fontSize: 10, color: '#c9a84c', background: 'rgba(201,168,76,0.1)', padding: '2px 8px', borderRadius: 99 }}>
            🪙 {quest.reward.gold} gold
          </span>
        )}
        {quest.reward.trust?.map(t => (
          <span key={t.npcId} style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99 }}>
            ❤️ {t.npcId} +{t.amount}
          </span>
        ))}
      </div>

      {onStart && (
        <button
          onPointerDown={onStart}
          style={{
            marginTop: 10, width: '100%', padding: '8px', borderRadius: 8,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#c9a84c', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Accept Quest
        </button>
      )}
    </div>
  )
}
