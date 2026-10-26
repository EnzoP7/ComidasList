// Piezas de la "pizarra de feria": paneles, tiza, conteos y controles.

export function Card({ className = '', variant = 'panel', children, ...props }) {
  const look = variant === 'ruled'
    ? 'border-t border-dashed border-white/[0.18] pt-5'
    : 'rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)] sm:p-5'
  return (
    <section className={`${look} ${className}`} {...props}>
      {children}
    </section>
  )
}

// Título de sección escrito a tiza (la propia frase es el título, sin etiquetas encima)
export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-hand text-[26px] font-semibold leading-none text-zinc-100">{children}</h2>
      {action}
    </div>
  )
}

// Encabezado de cada pantalla: título grande a tiza + una línea de propósito
export function PageHeader({ title, children, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-hand text-[40px] font-bold leading-[0.9] text-zinc-50">{title}</h1>
        {children && <p className="mt-1.5 max-w-prose text-sm text-zinc-400">{children}</p>}
      </div>
      {action}
    </div>
  )
}

const TONES = {
  accent: 'bg-accent',
  sky: 'bg-sky-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  pink: 'bg-pink-400',
  orange: 'bg-orange-300',
  aqua: 'bg-aqua-400',
  lilac: 'bg-lilac-400',
}

// Barra de tiza: se traza con transform (scaleX), nunca animando el ancho
export function ProgressBar({ value, max, tone = 'accent', marker, size = 'md' }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const markerPct = marker && max > 0 ? Math.min(100, (marker / max) * 100) : null
  return (
    <div className={`chalk-stroke relative w-full overflow-hidden bg-white/[0.08] ${size === 'sm' ? 'h-2' : 'h-3'}`}>
      <div className={`fill-x h-full w-full ${TONES[tone]}`} style={{ transform: `scaleX(${ratio})` }} />
      {markerPct != null && markerPct < 100 && (
        <div className="absolute top-0 h-full w-0.5 bg-zinc-100/50" style={{ left: `${markerPct}%` }} />
      )}
    </div>
  )
}

// Subrayado a tiza que se dibuja solo al aparecer (se monta cuando se cumple una meta)
export function ChalkUnderline({ className = 'text-accent', width = 'w-full' }) {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={`chalk-draw pointer-events-none block h-2.5 ${width} ${className}`} aria-hidden="true">
      <path
        d="M2 6.5 C 18 3.5, 34 8.5, 52 5.5 S 84 3.5, 98 6"
        pathLength="100" style={{ '--len': 100 }}
        fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Palitos de conteo de feria: grupos de cinco (cuatro y uno cruzado)
export function Tally({ count, max, className = 'text-zinc-100', faint = 'text-zinc-700' }) {
  const total = Math.max(count, max ?? count)
  const groups = Math.ceil(total / 5)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" role="img" aria-label={`${count}${max ? ` de ${max}` : ''}`}>
      {Array.from({ length: groups }, (_, g) => {
        const start = g * 5
        return (
          <svg key={g} viewBox="0 0 30 20" className="h-5 w-[30px]" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i} x1={4 + i * 6} y1="3" x2={3 + i * 6} y2="17"
                className={start + i < count ? className : faint}
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
              />
            ))}
            {start + 4 < total && (
              <line x1="1" y1="15" x2="25" y2="5" className={start + 4 < count ? className : faint} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>
        )
      })}
    </span>
  )
}

// Cifra a tiza: se "re-escribe" cuando cambia el valor
export function ChalkNumber({ value, className = '' }) {
  return (
    <span key={value} className={`rechalk font-chalk ${className}`}>{value}</span>
  )
}

// Borrar como con el borrador: difumina el elemento y después ejecuta la acción
export function erase(el, done) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!el?.animate || reduce) return done()
  el.animate(
    [{ opacity: 1, filter: 'blur(0px)', transform: 'translateX(0)' }, { opacity: 0, filter: 'blur(4px)', transform: 'translateX(8px)' }],
    { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
  ).finished.then(done, done)
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-accent text-ink-950 font-bold hover:bg-lime-300',
    ghost: 'border border-dashed border-white/[0.18] text-zinc-200 hover:border-white/30 hover:bg-white/[0.04]',
    danger: 'border border-dashed border-rose-300/40 text-rose-300 hover:bg-rose-500/10',
    plain: 'text-zinc-400 hover:text-zinc-100',
  }
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-[15px]', icon: 'h-9 w-9' }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}

export function Input({ label, prefix, suffix, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-xs text-zinc-400">{label}</span>}
      <div className="flex h-10 items-center rounded-lg border border-white/[0.1] bg-black/[0.18] px-3 transition-colors focus-within:border-accent/70">
        {prefix && <span className="mr-2 shrink-0 text-[15px] leading-none">{prefix}</span>}
        <input
          className="w-full min-w-0 bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600"
          {...props}
        />
        {suffix && <span className="ml-2 shrink-0 text-xs text-zinc-500">{suffix}</span>}
      </div>
    </label>
  )
}

export function Select({ label, options, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-xs text-zinc-400">{label}</span>}
      <select
        className="h-10 w-full rounded-lg border border-white/[0.1] bg-black/[0.18] px-3 text-[15px] text-zinc-100 outline-none transition-colors focus:border-accent/70"
        {...props}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// Convierte el texto de un input numérico en número o null
export const num = (v) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const fmt = (n, digits = 0) =>
  n == null || Number.isNaN(n)
    ? '—'
    : n.toLocaleString('es-UY', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

const paths = {
  today: 'M4 5h16v14H4zM4 9h16M9 5V3m6 2V3',
  box: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm0 0L12 12m0 0 8-4.5M12 12v9',
  chart: 'M3 17l5-5 4 3 8-8M15 7h5v5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  check: 'm5 12 5 5 9-10',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  flame: 'M12 21c-4 0-7-2.7-7-6.5 0-3.5 3-5.5 4-9 2 1.5 3 3.5 3 5.5 1-1 1.5-2 1.5-3.5 2.5 2 4.5 4.5 4.5 7 0 3.8-3 6.5-6 6.5Z',
  scale: 'M5 4h14l1 16H4L5 4Zm7 4v4m-3-2.5 3 2.5',
  steps: 'M7 20c-1.5 0-2.5-1.3-2.2-3l.6-3c.3-1.5 1.6-2.3 3-1.9 1.3.4 2 1.7 1.6 3.1l-.8 2.9c-.4 1.2-1.1 1.9-2.2 1.9Zm9-8c-1.1 0-1.8-.7-2.2-1.9l-.8-2.9C12.6 5.8 13.3 4.5 14.6 4c1.4-.4 2.7.4 3 1.9l.6 3c.3 1.7-.7 3.1-2.2 3.1Z',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  drop: 'M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z',
  apple: 'M12 7.5c-1.5-1.2-5.5-1.6-6.8 2-1.2 3.4.6 8.3 3 9.8 1.3.8 2.4.2 3.8.2s2.5.6 3.8-.2c2.4-1.5 4.2-6.4 3-9.8-1.3-3.6-5.3-3.2-6.8-2Zm0 0c0-2 1-3.5 3-4',
  more: 'M4 7h16M4 12h16M4 17h10',
  bowl: 'M3 11h18a9 9 0 0 1-18 0Zm5-3.5c0-1 1-1.5 1-2.5m3 2.5c0-1 1-1.5 1-2.5m3 2.5c0-1 1-1.5 1-2.5',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1v-10a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.5h.01',
  chalk: 'M6 18 17 7l2 2L8 20H6v-2Zm9-9 2 2',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  cart: 'M3 4h2l2.2 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 19.5h.01M17 19.5h.01',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
