import Link from 'next/link'
import { AuthLightMode } from '@/components/auth/auth-light-mode'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const APP_NAME = 'Viros GST Billing'

export const metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description: 'Terms of service and user agreement for Viros GST Billing ERP software.',
}

export default function TermsOfServicePage() {
  return (
    <>
      <AuthLightMode />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-200 via-blue-300 to-indigo-400">
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <article className="rounded-2xl border border-white/70 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
                  <p className="mt-1 text-sm text-slate-500">Last updated: July 21, 2026</p>
                </div>
              </div>

              <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 sm:text-base">
                <section>
                  <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
                  <p className="mt-2">
                    By registering for, accessing, or using {APP_NAME} (&quot;Service&quot;), you agree to be bound
                    by these Terms of Service. If you do not agree to these terms, please do not use our Service.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">2. Account Registration &amp; Organisation Approval</h2>
                  <p className="mt-2">
                    To access the ERP &amp; Billing features, you must register your organisation and administrator details accurately.
                    All new organisation registrations are subject to verification and approval by our team before access is granted.
                    You are responsible for maintaining the confidentiality of your login credentials.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">3. GST Compliance &amp; Billing Data</h2>
                  <p className="mt-2">
                    You are solely responsible for ensuring that all tax identification numbers (GSTIN, PAN), invoice numbers,
                    tax computations, and customer/vendor details entered into the platform comply with applicable GST laws and regulations in India.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">4. User Conduct &amp; Prohibited Uses</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>You agree not to use the Service for any unlawful or fraudulent purpose.</li>
                    <li>You agree not to attempt to compromise system integrity, security, or unauthorized multi-tenant access.</li>
                    <li>You agree not to upload malicious software or interfere with other users&apos; service.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">5. Data Ownership &amp; Privacy</h2>
                  <p className="mt-2">
                    You retain full ownership of all data, customer information, inventory records, and financial entries created by your organisation.
                    We process and store your information in accordance with our{' '}
                    <Link href="/privacy-policy" className="font-semibold text-blue-600 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">6. Service Availability &amp; Modifications</h2>
                  <p className="mt-2">
                    We strive for maximum uptime and reliability, but do not guarantee uninterrupted service. We reserve the right to
                    modify, update, or discontinue features with prior notice whenever feasible.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">7. Termination</h2>
                  <p className="mt-2">
                    We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">8. Contact Information</h2>
                  <p className="mt-2">
                    For any questions regarding these Terms of Service, please contact us at{' '}
                    <a
                      href="mailto:support@viros.in"
                      className="font-medium text-blue-700 underline-offset-2 hover:underline"
                    >
                      support@viros.in
                    </a>
                    .
                  </p>
                </section>
              </div>
            </article>
          </div>
        </main>

        <footer className="border-t border-white/20 bg-white/40 py-6 text-center text-sm text-slate-600">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </div>
    </>
  )
}
