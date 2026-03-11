'use client'

// Visual day/night cycle overlay — no Phaser, pure CSS

type Props = { hour: number; minute: number }

type Keyframe = { color: string; opacity: number; label: string }

const KEYFRAMES: { time: number; frame: Keyframe }[] = [
  { time:  0, frame: { color: '8,12,45',    opacity: 0.68, label: 'Night'       } },
  { time:  5, frame: { color: '180,80,20',  opacity: 0.22, label: 'Dawn'        } },
  { time:  6, frame: { color: '220,130,40', opacity: 0.10, label: 'Sunrise'     } },
  { time:  7, frame: { color: '255,255,255',opacity: 0.00, label: 'Morning'     } },
  { time: 17, frame: { color: '255,255,255',opacity: 0.00, label: 'Afternoon'   } },
  { time: 18, frame: { color: '220,100,30', opacity: 0.12, label: 'Golden Hour' } },
  { time: 19, frame: { color: '160,60,20',  opacity: 0.28, label: 'Dusk'        } },
  { time: 20, frame: { color: '40,20,80',   opacity: 0.42, label: 'Evening'     } },
  { time: 21, frame: { color: '15,10,50',   opacity: 0.58, label: 'Late Evening'} },
  { time: 22, frame: { color: '8,12,45',    opacity: 0.68, label: 'Night'       } },
]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function parseRGB(s: string): [number,number,number] {
  const [r,g,b] = s.split(',').map(Number)
  return [r,g,b]
}

function getOverlay(hour: number, minute: number): { color: string; opacity: number; label: string } {
  const totalMins = hour * 60 + minute

  // Find surrounding keyframes
  let a = KEYFRAMES[KEYFRAMES.length - 1]
  let b = KEYFRAMES[0]

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (totalMins >= KEYFRAMES[i].time * 60 && totalMins < KEYFRAMES[i + 1].time * 60) {
      a = KEYFRAMES[i]; b = KEYFRAMES[i + 1]; break
    }
  }

  const t = (totalMins - a.time * 60) / ((b.time - a.time) * 60 || 1)
  const [ar,ag,ab] = parseRGB(a.frame.color)
  const [br,bg,bb] = parseRGB(b.frame.color)
  const r = Math.round(lerp(ar,br,t))
  const g = Math.round(lerp(ag,bg,t))
  const bl= Math.round(lerp(ab,bb,t))
  const op = lerp(a.frame.opacity, b.frame.opacity, t)

  return {
    color: `${r},${g},${bl}`,
    opacity: op,
    label: op < 0.05 ? 'Day' : (t < 0.5 ? a.frame.label : b.frame.label),
  }
}

// Stars (only at night)
function Stars({ opacity }: { opacity: number }) {
  if (opacity < 0.3) return null
  const starOpacity = Math.min(1, (opacity - 0.3) / 0.3)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {STAR_POSITIONS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: '#ffffff',
          opacity: starOpacity * s.alpha,
          animation: `twinkle ${s.dur}s ease-in-out infinite`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  )
}

// Pre-seeded star positions (deterministic, no Math.random at render time)
const STAR_POSITIONS = Array.from({ length: 40 }, (_, i) => {
  const seed = (i * 7919 + 1) % 10000
  return {
    x:     ((seed * 13) % 100),
    y:     ((seed * 7)  % 45),   // upper half only
    size:  ((seed % 2) + 1),
    alpha: 0.4 + (seed % 60) / 100,
    dur:   2 + (seed % 3),
    delay: (seed % 30) / 10,
  }
})

export default function DayNightOverlay({ hour, minute }: Props) {
  const { color, opacity, label } = getOverlay(hour, minute)

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%,100% { opacity: var(--op, 0.5); transform: scale(1); }
          50% { opacity: calc(var(--op, 0.5) * 0.4); transform: scale(0.7); }
        }
      `}</style>

      {/* Main color overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(${color},${opacity})`,
        pointerEvents: 'none',
        transition: 'background 4s ease',
        zIndex: 9900,
      }} />

      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 9901, pointerEvents: 'none', overflow: 'hidden' }}>
        <Stars opacity={opacity} />
      </div>

      {/* Time-of-day label (subtle, top-center) */}
      {opacity > 0.08 && (
        <div style={{
          position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, color: `rgba(255,255,220,${Math.min(0.6, opacity * 1.2)})`,
          fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'Inter, sans-serif', pointerEvents: 'none',
          zIndex: 9910, transition: 'opacity 4s ease',
        }}>
          {label}
        </div>
      )}
    </>
  )
}
