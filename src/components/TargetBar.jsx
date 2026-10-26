import { fmt } from './ui'

// Barra frente a lo ideal para una comida. Escala hasta 130% con la marca del 100%.
// soft: carbohidratos y grasas son orientativos por comida (lo que importa es el total del día)
export default function TargetBar({ label, value, target, unit, soft = false }) {
  const pct = target ? (value / target) * 100 : 0
  const low = soft ? 60 : 85
  const high = soft ? 140 : 115
  const tone = pct < low ? 'bg-amber-400' : pct > high ? 'bg-rose-400' : 'bg-accent'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="tabular text-zinc-500"><b className="text-zinc-200">{fmt(value)}</b> / {fmt(target)} {unit}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`fill-x h-full w-full rounded-full ${tone}`} style={{ transform: `scaleX(${Math.min(1, pct / 130)})` }} />
        <div className="absolute top-0 h-full w-0.5 bg-zinc-100/50" style={{ left: `${(100 / 130) * 100}%` }} />
      </div>
    </div>
  )
}
