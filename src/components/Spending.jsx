import { usePersistentState } from '../lib/storage'
import Expenses from './Expenses'
import Prices from './Prices'
import { PageHeader } from './ui'

const VIEWS = [
  { id: 'log', label: 'Registro de gastos', icon: '🧾' },
  { id: 'budget', label: 'Presupuesto estimado', icon: '📊' },
]

// Gastos: lo que realmente gastás (registro) y lo que estimás gastar (presupuesto)
export default function Spending({ expenses, setExpenses, prices, setPrices, logs, settings, setSettings, ...rest }) {
  const [view, setView] = usePersistentState('ui:spendingView', 'log')
  return (
    <div className="space-y-4">
      <PageHeader title="Gastos">Lo que gastás de verdad en el plan, mes a mes, frente a lo que estimaste.</PageHeader>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-dashed border-white/[0.16] p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id} onClick={() => setView(v.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm transition-colors ${
              view === v.id ? 'bg-white/[0.1] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <span className="truncate">{v.label}</span>
          </button>
        ))}
      </div>
      {view === 'log'
        ? <Expenses expenses={expenses} setExpenses={setExpenses} prices={prices} logs={logs} settings={settings} setSettings={setSettings} />
        : <Prices prices={prices} setPrices={setPrices} logs={logs} settings={settings} {...rest} />}
    </div>
  )
}
