import { generateInvoicePdfBuffer, generateProformaPdfBuffer } from '../lib/quotation-pdf'

function runTest() {
  const sampleCustomer = {
    name: 'Acme Corp',
    billing_address: '123 Main St',
    billing_city: 'Mumbai',
    billing_state: 'Maharashtra',
  }

  const sampleItems = [
    {
      product_name: 'Widget A',
      hsn_code: '8471',
      quantity: 2,
      rate: 1000,
      discount: 0,
      gst_rate: 18,
      amount: 2360,
    }
  ]

  const settingsWithBank = {
    companyName: 'Viros Tech Solutions',
    state: 'Maharashtra',
    bankName: 'HDFC Bank',
    bankAccount: '123456789012',
    bankIfsc: 'HDFC0001234',
    bankBranch: 'Andheri West',
    upiId: 'viros@hdfcbank',
    termsCondition: '1. Payment due in 30 days.',
  }

  console.log('--- 1. Testing Sales Invoice with Bank Details ENABLED ---')
  const invEnabled = generateInvoicePdfBuffer(
    {
      invoice_no: 'INV/2026/001',
      date: '2026-09-08',
      subtotal: 2000,
      discount_amount: 0,
      tax_amount: 360,
      round_off: 0,
      total_amount: 2360,
      customer: sampleCustomer,
      items: sampleItems,
    },
    { ...settingsWithBank, showBankDetailsInvoice: true }
  )
  const invEnabledStr = Buffer.from(invEnabled).toString('latin1')
  const invHasBank = invEnabledStr.includes('Bank Details') && invEnabledStr.includes('HDFC Bank')
  console.log(`Invoice Enabled: Generated ${invEnabled.byteLength} bytes. Contains bank details: ${invHasBank}`)

  console.log('--- 2. Testing Sales Invoice with Bank Details DISABLED ---')
  const invDisabled = generateInvoicePdfBuffer(
    {
      invoice_no: 'INV/2026/001',
      date: '2026-09-08',
      subtotal: 2000,
      discount_amount: 0,
      tax_amount: 360,
      round_off: 0,
      total_amount: 2360,
      customer: sampleCustomer,
      items: sampleItems,
    },
    { ...settingsWithBank, showBankDetailsInvoice: false }
  )
  const invDisabledStr = Buffer.from(invDisabled).toString('latin1')
  const invOmittedBank = !invDisabledStr.includes('Bank Details') && !invDisabledStr.includes('HDFC Bank')
  console.log(`Invoice Disabled: Generated ${invDisabled.byteLength} bytes. Bank details omitted: ${invOmittedBank}`)

  console.log('--- 3. Testing Proforma with Bank Details ENABLED ---')
  const profEnabled = generateProformaPdfBuffer(
    {
      proforma_no: 'PI/2026/001',
      date: '2026-09-08',
      subtotal: 2000,
      discount_amount: 0,
      tax_amount: 360,
      round_off: 0,
      total_amount: 2360,
      customer: sampleCustomer,
      items: sampleItems,
    },
    { ...settingsWithBank, showBankDetailsProforma: true }
  )
  const profEnabledStr = Buffer.from(profEnabled).toString('latin1')
  const profHasBank = profEnabledStr.includes('Bank Details') && profEnabledStr.includes('HDFC Bank')
  console.log(`Proforma Enabled: Generated ${profEnabled.byteLength} bytes. Contains bank details: ${profHasBank}`)

  console.log('--- 4. Testing Proforma with Bank Details DISABLED ---')
  const profDisabled = generateProformaPdfBuffer(
    {
      proforma_no: 'PI/2026/001',
      date: '2026-09-08',
      subtotal: 2000,
      discount_amount: 0,
      tax_amount: 360,
      round_off: 0,
      total_amount: 2360,
      customer: sampleCustomer,
      items: sampleItems,
    },
    { ...settingsWithBank, showBankDetailsProforma: false }
  )
  const profDisabledStr = Buffer.from(profDisabled).toString('latin1')
  const profOmittedBank = !profDisabledStr.includes('Bank Details') && !profDisabledStr.includes('HDFC Bank')
  console.log(`Proforma Disabled: Generated ${profDisabled.byteLength} bytes. Bank details omitted: ${profOmittedBank}`)

  if (invHasBank && invOmittedBank && profHasBank && profOmittedBank) {
    console.log('\n SUCCESS: All 4 test cases passed flawlessly!')
  } else {
    console.error('\n FAILED: Some test cases did not behave as expected!')
    process.exit(1)
  }
}

runTest()
