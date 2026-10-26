import { addDays, formatLong, todayKey } from '../lib/date'
import { Button, Icon } from './ui'

export default function DateNav({ date, setDate }) {
  const isToday = date === todayKey()
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
        <Icon name="left" className="h-4 w-4" />
      </Button>
      <div className="text-center">
        <p className="font-hand text-[26px] leading-none text-zinc-100 first-letter:uppercase">{formatLong(date)}</p>
        {!isToday && (
          <button onClick={() => setDate(todayKey())} className="mt-1 text-xs text-accent underline decoration-dashed underline-offset-4">
            Volver a hoy
          </button>
        )}
      </div>
      <Button
        variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))}
        disabled={isToday} aria-label="Día siguiente"
      >
        <Icon name="right" className="h-4 w-4" />
      </Button>
    </div>
  )
}
