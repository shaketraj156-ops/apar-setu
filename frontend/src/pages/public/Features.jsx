const items = [
  ['APAAR-based student identity', 'Connect admission records to a unique academic identity and support consistent student-level records.'],
  ['CSV and API data upload', 'Give institutions a structured way to submit admission data in batches or through connected services.'],
  ['Automated validation', 'Check required fields, APAAR format, dates, categories, and other data rules as records arrive.'],
  ['Duplicate detection', 'Identify repeated records within a batch and potential cross-institution enrolment for review.'],
  ['Approved intake monitoring', 'Compare admissions with approved intake and relevant quota information to surface exceptions.'],
  ['Real-time dashboards', 'Give AICTE and institutions visibility into batches, data quality, duplicates, intake, and risk.'],
  ['Consent-based verification', 'Let students respond to verification requests and limit disclosure to approved information.'],
  ['QR verifiable credentials', 'Support QR-linked credentials that can be checked for validity without exposing unnecessary data.'],
  ['Reports and analytics', 'Summarize compliance and trends with report views and export workflows.'],
  ['Security, privacy, and audit trail', 'Use role-aware access patterns, minimum disclosure, and traceable audit events to support accountability.'],
]
export default function Features() {
  return <main className="page-shell"><header className="page-heading"><p className="eyebrow">Platform capabilities</p><h1 className="section-title">Features built for trusted academic records</h1><p className="mt-4 text-slate-600">A connected set of tools supports institutions from the first data upload through validation, monitoring, and verification.</p></header><div className="grid gap-5 sm:grid-cols-2">{items.map(([title, body], i) => <article className="info-card" key={title}><span className="number-badge">{String(i + 1).padStart(2, '0')}</span><h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 leading-7 text-slate-600">{body}</p></article>)}</div></main>
}
