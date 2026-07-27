import Link from 'next/link'
import { AuthLightMode } from '@/components/auth/auth-light-mode'
import { ArrowLeft } from 'lucide-react'

const APP_NAME = 'Viros GST Billing'

export const metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description: 'Privacy policy for Viros GST Billing ERP software.',
}

export default function PrivacyPolicyPage() {
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
              <p className="mt-2 text-sm text-slate-500">Last updated: July 21, 2026</p>

              <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 sm:text-base">
                <section>
                  <h2 className="text-lg font-semibold text-slate-900">1. Introduction</h2>
                  <p className="mt-2">
                    {APP_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This
                    policy explains how we collect, use, store, and protect information when you use our
                    GST billing and ERP platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">2. Information We Collect</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Account details such as name, email, mobile number, and organisation information.</li>
                    <li>Business data you enter, including customers, vendors, products, invoices, and GST records.</li>
                    <li>Usage and technical data such as login timestamps, browser type, and IP address for security.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">3. How We Use Your Information</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>To provide and maintain the billing, inventory, and reporting features of the service.</li>
                    <li>To authenticate users, manage organisations, and enforce role-based access.</li>
                    <li>To send account-related communications such as password reset OTPs.</li>
                    <li>To improve security, prevent fraud, and comply with applicable laws.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">4. Data Storage &amp; Security</h2>
                  <p className="mt-2">
                    Your data is stored on secure servers. Passwords are hashed, and access to business records
                    is restricted by organisation and user permissions. While we take reasonable measures to protect
                    your information, no method of transmission over the internet is completely secure.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">5. Data Sharing</h2>
                  <p className="mt-2">
                    We do not sell your personal or business data. Information may be shared only when required
                    by law, to protect our rights, or with service providers who assist in operating the platform
                    under strict confidentiality obligations.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">6. Your Rights</h2>
                  <p className="mt-2">
                    You may request access to, correction of, or deletion of your account data by contacting
                    our support team. Organisation owners are responsible for data entered by their staff members.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">7. Cookies &amp; Sessions</h2>
                  <p className="mt-2">
                    We use session cookies and local storage to keep you signed in and remember preferences such
                    as theme and sidebar state. These are essential for the application to function properly.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">8. Changes to This Policy</h2>
                  <p className="mt-2">
                    We may update this privacy policy from time to time. Continued use of the service after
                    changes are posted constitutes acceptance of the revised policy.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-slate-900">9. Contact Us</h2>
                  <p className="mt-2">
                    For privacy-related questions, contact us at{' '}
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
