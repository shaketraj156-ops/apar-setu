export default function About() {
  return <main className="page-shell"><header className="page-heading"><p className="eyebrow">About the project</p><h1 className="section-title">A clearer path from student records to trusted verification</h1><p className="mt-4 text-lg leading-8 text-slate-600">APAARSetu is an APAAR ID-based student data management and verification platform concept for AICTE-approved institutions.</p></header><div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">{[
    ['What it is', 'A shared workflow for submitting, validating, monitoring, and verifying student-level admission records.'],
    ['The problem it addresses', 'Different reporting practices and manual checks make it harder to identify authentic admissions, duplicates, and intake exceptions.'],
    ['Who it serves', 'Institutions, AICTE teams, students, authorized verifiers such as employers and regulators, and auditors.'],
    ['What APAAR ID means', 'APAAR is the Automated Permanent Academic Account Registry, a lifelong academic identity intended to help link a learner’s records. This demo uses synthetic identifiers.'],
    ['Why it matters', 'Structured records and traceable review workflows can improve transparency, compliance monitoring, and trust between stakeholders.'],
  ].map(([title, body]) => <section className="info-card" key={title}><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-3 leading-7 text-slate-600">{body}</p></section>)}</div><aside className="mx-auto mt-8 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><strong>Demonstration notice:</strong> The current version uses a mock APAAR registry and synthetic data for demonstration.</aside></main>
}
