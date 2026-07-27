'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, MessageCircle, FileText, Clock, ExternalLink } from 'lucide-react'

const SUPPORT_EMAIL = 'support@viros.in'
const SUPPORT_PHONE = '+91 98765 43210'

const faqs = [
  {
    question: 'How do I reset my password?',
    answer:
      'Use the Forgot Password link on the login page. You will receive a one-time password (OTP) on your registered email.',
  },
  {
    question: 'Why is my organisation pending approval?',
    answer:
      'New registrations require Super Admin approval before you can sign in. Contact support if approval is delayed.',
  },
  {
    question: 'How do I generate GST-compliant invoices?',
    answer:
      'Go to Sales Invoice, create a new invoice, select a customer, add line items with HSN codes and GST rates, then save or download the PDF.',
  },
  {
    question: 'Can I assign limited access to staff?',
    answer:
      'Yes. Organisation admins can manage staff and assign module permissions from the Staff and Staff Permissions pages.',
  },
]

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Need help with billing, inventory, or your account? Reach out to our team or browse common questions below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-primary" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              We typically respond within one business day.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-primary" />
              Phone Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="text-sm font-medium text-primary hover:underline">
              {SUPPORT_PHONE}
            </a>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Mon–Sat, 10:00 AM – 6:00 PM IST
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-foreground">{faq.question}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Legal &amp; Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Privacy Policy
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
