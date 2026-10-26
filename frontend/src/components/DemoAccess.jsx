import { DEMO_ACCOUNTS } from '../config/demoAccounts'
import useDemoLogin from '../hooks/useDemoLogin'

/** One-click demo entry: a card per role. `compact` renders a tighter list for the login page. */
export default function DemoAccess({ compact = false }) {
  const { enterAs, busyKey, error } = useDemoLogin()
  return (
    <div>
      <div className={compact ? 'grid gap-2' : 'grid gap-4 sm:grid-cols-2'}>
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.key}
            type="button"
            disabled={Boolean(busyKey)}
            onClick={() => enterAs(account)}
            className={`rounded-2xl border border-slate-200 bg-white text-left transition hover:border-blue-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60 ${compact ? 'px-4 py-3' : 'p-5'}`}
          >
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-extrabold text-slate-950">{account.title}</span>
                <span className="block text-xs text-slate-500">{account.subtitle}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-blue-700">{busyKey === account.key ? 'Opening…' : 'Enter →'}</span>
            </span>
            {!compact && (
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {account.highlights.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            )}
          </button>
        ))}
      </div>
      {error && <p className="form-error mt-4" role="alert">{error}</p>}
    </div>
  )
}
