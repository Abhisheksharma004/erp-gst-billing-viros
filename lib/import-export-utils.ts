import * as XLSX from 'xlsx'

export interface CustomerImportRow {
  name: string
  contactPerson: string
  phone: string
  mobile?: string
  email?: string
  gstin: string
  pan?: string
  billingAddress: string
  billingCity?: string
  billingState?: string
  billingPincode?: string
  shippingAddress?: string
  shippingCity?: string
  shippingState?: string
  shippingPincode?: string
  creditLimit?: number
  openingBalance?: number
  notes?: string
}

export interface VendorImportRow {
  name: string
  contactPerson: string
  phone: string
  mobile?: string
  email?: string
  gstin: string
  pan?: string
  address: string
  city?: string
  state?: string
  pincode?: string
  creditLimit?: number
  openingBalance?: number
  notes?: string
}

export interface ImportValidationResult<T> {
  rowIndex: number
  data: T
  status: 'valid' | 'duplicate_db' | 'duplicate_file' | 'invalid'
  errors: string[]
  duplicateField?: 'gstin' | 'phone' | 'name'
  duplicateReason?: string
}

export const CUSTOMER_TEMPLATE_HEADERS = [
  'Customer Name *',
  'Contact Person *',
  'Phone *',
  'Email',
  'GSTIN *',
  'PAN',
  'Billing Address *',
  'City',
  'State',
  'Pincode',
  'Shipping Address',
  'Shipping City',
  'Shipping State',
  'Shipping Pincode',
  'Credit Limit',
  'Opening Balance',
  'Notes',
]

export const VENDOR_TEMPLATE_HEADERS = [
  'Vendor Name *',
  'Contact Person *',
  'Phone *',
  'Email',
  'GSTIN *',
  'PAN',
  'Address *',
  'City',
  'State',
  'Pincode',
  'Credit Limit',
  'Opening Balance',
  'Notes',
]

/**
 * Creates and triggers a download of a clean Excel (.xlsx) template file with only column headers
 */
export function downloadWorkbookTemplate(
  filename: string,
  sheetName: string,
  headers: string[]
) {
  // Only the header row with no data rows (empty format for user to fill)
  const ws = XLSX.utils.aoa_to_sheet([headers])

  // Auto-adjust column widths
  ws['!cols'] = headers.map((h) => ({
    wch: Math.max(h.length + 4, 18),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function downloadCustomerTemplate() {
  downloadWorkbookTemplate('Customer_Import_Format.xlsx', 'Customers', CUSTOMER_TEMPLATE_HEADERS)
}

export function downloadVendorTemplate() {
  downloadWorkbookTemplate('Vendor_Import_Format.xlsx', 'Vendors', VENDOR_TEMPLATE_HEADERS)
}

/**
 * Normalizes an arbitrary header string by stripping asterisks, spaces, dashes, and underscores
 */
function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .replace(/[*_#\-/\\]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

/**
 * Parses an uploaded File (.xlsx, .xls, .csv) into raw array of records
 */
export async function parseUploadedFile(file: File): Promise<Record<string, unknown>[]> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return []
  const ws = wb.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: false,
  })
  return rawRows
}

/**
 * Maps raw imported rows to standardized CustomerImportRow objects
 */
export function mapToCustomerImportRow(raw: Record<string, unknown>): CustomerImportRow {
  const normalized: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeHeaderKey(k)] = String(v ?? '').trim()
  }

  const name = normalized['customername'] || normalized['name'] || normalized['companyname'] || normalized['partyname'] || ''
  const contactPerson = normalized['contactperson'] || normalized['contactname'] || normalized['contact'] || name
  const phone = normalized['phone'] || normalized['phonenumber'] || normalized['contactno'] || normalized['contactnumber'] || normalized['telephonenumber'] || ''
  const mobile = normalized['mobile'] || normalized['mobilenumber'] || ''
  const email = normalized['email'] || normalized['emailid'] || normalized['emailaddress'] || ''
  const gstin = (normalized['gstin'] || normalized['gst'] || normalized['gstnumber'] || normalized['gstno'] || '').toUpperCase()
  let pan = (normalized['pan'] || normalized['pannumber'] || normalized['panno'] || '').toUpperCase()
  if (!pan && gstin && gstin.length === 15) {
    // Auto-extract PAN from GSTIN (characters 3 to 12)
    pan = gstin.substring(2, 12)
  }

  const billingAddress = normalized['billingaddress'] || normalized['address'] || normalized['street'] || ''
  const billingCity = normalized['city'] || normalized['billingcity'] || ''
  const billingState = normalized['state'] || normalized['billingstate'] || ''
  const billingPincode = normalized['pincode'] || normalized['billingpincode'] || normalized['pin'] || normalized['postalcode'] || ''

  const shippingAddress = normalized['shippingaddress'] || billingAddress
  const shippingCity = normalized['shippingcity'] || billingCity
  const shippingState = normalized['shippingstate'] || billingState
  const shippingPincode = normalized['shippingpincode'] || billingPincode

  const creditLimit = Number(normalized['creditlimit'] || 0) || 0
  const openingBalance = Number(normalized['openingbalance'] || 0) || 0
  const notes = normalized['notes'] || normalized['note'] || normalized['remarks'] || ''

  return {
    name,
    contactPerson,
    phone,
    mobile: mobile || undefined,
    email: email || undefined,
    gstin,
    pan: pan || undefined,
    billingAddress,
    billingCity: billingCity || undefined,
    billingState: billingState || undefined,
    billingPincode: billingPincode || undefined,
    shippingAddress: shippingAddress || undefined,
    shippingCity: shippingCity || undefined,
    shippingState: shippingState || undefined,
    shippingPincode: shippingPincode || undefined,
    creditLimit,
    openingBalance,
    notes: notes || undefined,
  }
}

/**
 * Maps raw imported rows to standardized VendorImportRow objects
 */
export function mapToVendorImportRow(raw: Record<string, unknown>): VendorImportRow {
  const normalized: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeHeaderKey(k)] = String(v ?? '').trim()
  }

  const name = normalized['vendorname'] || normalized['name'] || normalized['companyname'] || normalized['partyname'] || normalized['suppliername'] || ''
  const contactPerson = normalized['contactperson'] || normalized['contactname'] || normalized['contact'] || name
  const phone = normalized['phone'] || normalized['phonenumber'] || normalized['contactno'] || normalized['contactnumber'] || ''
  const mobile = normalized['mobile'] || normalized['mobilenumber'] || ''
  const email = normalized['email'] || normalized['emailid'] || normalized['emailaddress'] || ''
  const gstin = (normalized['gstin'] || normalized['gst'] || normalized['gstnumber'] || normalized['gstno'] || '').toUpperCase()
  let pan = (normalized['pan'] || normalized['pannumber'] || normalized['panno'] || '').toUpperCase()
  if (!pan && gstin && gstin.length === 15) {
    pan = gstin.substring(2, 12)
  }

  const address = normalized['address'] || normalized['vendoraddress'] || normalized['street'] || ''
  const city = normalized['city'] || ''
  const state = normalized['state'] || ''
  const pincode = normalized['pincode'] || normalized['pin'] || normalized['postalcode'] || ''

  const creditLimit = Number(normalized['creditlimit'] || 0) || 0
  const openingBalance = Number(normalized['openingbalance'] || 0) || 0
  const notes = normalized['notes'] || normalized['note'] || normalized['remarks'] || ''

  return {
    name,
    contactPerson,
    phone,
    mobile: mobile || undefined,
    email: email || undefined,
    gstin,
    pan: pan || undefined,
    address,
    city: city || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
    creditLimit,
    openingBalance,
    notes: notes || undefined,
  }
}
