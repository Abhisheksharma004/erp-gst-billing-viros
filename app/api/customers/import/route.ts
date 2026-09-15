import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { customerSchema } from '@/lib/validations'
import { randomUUID } from 'crypto'
import { CustomerImportRow, ImportValidationResult } from '@/lib/import-export-utils'

function sanitizeKey(val?: string | null): string {
  return String(val ?? '').trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('customers', 'create')
  if (error) return error

  try {
    const body = await req.json()
    const action = body.action || 'preview' // 'preview' | 'import'
    const rawRows: CustomerImportRow[] = Array.isArray(body.rows) ? body.rows : []
    const skipDuplicates = Boolean(body.skipDuplicates)

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 })
    }

    // Fetch existing customers in this organization for duplicate detection
    const [existingRows] = (await db.execute(
      'SELECT id, name, contact_person, gstin, phone, mobile FROM customers WHERE organization_id = ?',
      [organizationId]
    )) as [
      {
        id: string
        name: string
        contact_person: string | null
        gstin: string | null
        phone: string | null
        mobile: string | null
      }[],
      unknown
    ]

    const existingGstins = new Map<string, string>()
    const existingPhones = new Map<string, string>()
    const existingNames = new Map<string, string>()

    for (const c of existingRows) {
      if (c.gstin) existingGstins.set(c.gstin.trim().toUpperCase(), c.name)
      if (c.phone) existingPhones.set(c.phone.trim(), c.name)
      if (c.mobile) existingPhones.set(c.mobile.trim(), c.name)
      if (c.name) existingNames.set(sanitizeKey(c.name), c.name)
    }

    const seenGstinsInBatch = new Map<string, number>()
    const seenPhonesInBatch = new Map<string, number>()
    const seenNamesInBatch = new Map<string, number>()

    const validationResults: ImportValidationResult<CustomerImportRow>[] = []
    const validRowsToInsert: CustomerImportRow[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]
      const rowIndex = i + 1
      const errors: string[] = []

      // Validate against customerSchema
      const parseResult = customerSchema.safeParse({
        name: row.name,
        contactPerson: row.contactPerson,
        phone: row.phone,
        mobile: row.mobile || undefined,
        email: row.email || '',
        gstin: row.gstin,
        pan: row.pan || '',
        billingAddress: row.billingAddress,
        billingCity: row.billingCity || '',
        billingState: row.billingState || '',
        billingPincode: row.billingPincode || '',
        shippingAddress: row.shippingAddress || '',
        shippingCity: row.shippingCity || '',
        shippingState: row.shippingState || '',
        shippingPincode: row.shippingPincode || '',
        creditLimit: Number(row.creditLimit || 0),
        openingBalance: Number(row.openingBalance || 0),
        isActive: true,
        notes: row.notes || '',
      })

      if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
          const field = issue.path.join('.') || 'row'
          errors.push(`${field}: ${issue.message}`)
        }
      }

      const gstinNorm = (row.gstin || '').trim().toUpperCase()
      const phoneNorm = (row.phone || '').trim()
      const nameNorm = sanitizeKey(row.name)

      let duplicateField: 'gstin' | 'phone' | 'name' | undefined
      let duplicateReason: string | undefined
      let isDuplicateDb = false
      let isDuplicateFile = false

      // Check DB duplicates
      if (gstinNorm && existingGstins.has(gstinNorm)) {
        isDuplicateDb = true
        duplicateField = 'gstin'
        duplicateReason = `GSTIN '${gstinNorm}' already exists for '${existingGstins.get(gstinNorm)}'`
      } else if (phoneNorm && existingPhones.has(phoneNorm)) {
        isDuplicateDb = true
        duplicateField = 'phone'
        duplicateReason = `Phone '${phoneNorm}' already registered for '${existingPhones.get(phoneNorm)}'`
      } else if (nameNorm && existingNames.has(nameNorm)) {
        isDuplicateDb = true
        duplicateField = 'name'
        duplicateReason = `Customer name '${row.name}' already exists in database`
      }

      // Check In-File batch duplicates
      if (!isDuplicateDb) {
        if (gstinNorm && seenGstinsInBatch.has(gstinNorm)) {
          isDuplicateFile = true
          duplicateField = 'gstin'
          duplicateReason = `Duplicate GSTIN '${gstinNorm}' (already in Row ${seenGstinsInBatch.get(gstinNorm)})`
        } else if (phoneNorm && seenPhonesInBatch.has(phoneNorm)) {
          isDuplicateFile = true
          duplicateField = 'phone'
          duplicateReason = `Duplicate Phone '${phoneNorm}' (already in Row ${seenPhonesInBatch.get(phoneNorm)})`
        } else if (nameNorm && seenNamesInBatch.has(nameNorm)) {
          isDuplicateFile = true
          duplicateField = 'name'
          duplicateReason = `Duplicate Customer Name '${row.name}' (already in Row ${seenNamesInBatch.get(nameNorm)})`
        }
      }

      // Record in seen batch maps
      if (gstinNorm && !seenGstinsInBatch.has(gstinNorm)) seenGstinsInBatch.set(gstinNorm, rowIndex)
      if (phoneNorm && !seenPhonesInBatch.has(phoneNorm)) seenPhonesInBatch.set(phoneNorm, rowIndex)
      if (nameNorm && !seenNamesInBatch.has(nameNorm)) seenNamesInBatch.set(nameNorm, rowIndex)

      let status: 'valid' | 'duplicate_db' | 'duplicate_file' | 'invalid'
      if (errors.length > 0) {
        status = 'invalid'
      } else if (isDuplicateDb) {
        status = 'duplicate_db'
      } else if (isDuplicateFile) {
        status = 'duplicate_file'
      } else {
        status = 'valid'
        validRowsToInsert.push(row)
      }

      validationResults.push({
        rowIndex,
        data: row,
        status,
        errors,
        duplicateField,
        duplicateReason,
      })
    }

    const summary = {
      total: rawRows.length,
      valid: validationResults.filter((r) => r.status === 'valid').length,
      duplicateDb: validationResults.filter((r) => r.status === 'duplicate_db').length,
      duplicateFile: validationResults.filter((r) => r.status === 'duplicate_file').length,
      invalid: validationResults.filter((r) => r.status === 'invalid').length,
    }

    // If only preview was requested, return the full validation matrix
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        summary,
        previewRows: validationResults,
      })
    }

    // If import was requested:
    const rowsToImport = validationResults
      .filter((r) => r.status === 'valid' || (skipDuplicates && (r.status === 'duplicate_db' || r.status === 'duplicate_file') ? false : false))
      .map((r) => r.data)

    if (rowsToImport.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid non-duplicate rows available to import',
          summary,
        },
        { status: 400 }
      )
    }

    // Insert rows in database
    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      for (const row of rowsToImport) {
        const id = randomUUID()
        await conn.execute(
          `INSERT INTO customers (id, organization_id, name, contact_person, email, mobile, phone, gstin, pan,
            billing_address, billing_city, billing_state, billing_pincode,
            shipping_address, shipping_city, shipping_state, shipping_pincode,
            credit_limit, opening_balance, is_active, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            organizationId,
            row.name.trim(),
            row.contactPerson.trim(),
            row.email?.trim() || null,
            row.mobile?.trim() || null,
            row.phone.trim(),
            row.gstin.trim().toUpperCase(),
            row.pan?.trim().toUpperCase() || null,
            row.billingAddress.trim(),
            row.billingCity?.trim() || null,
            row.billingState?.trim() || null,
            row.billingPincode?.trim() || null,
            row.shippingAddress?.trim() || null,
            row.shippingCity?.trim() || null,
            row.shippingState?.trim() || null,
            row.shippingPincode?.trim() || null,
            Number(row.creditLimit || 0),
            Number(row.openingBalance || 0),
            1,
            row.notes?.trim() || null,
          ]
        )
      }

      await conn.commit()
    } catch (insertErr) {
      await conn.rollback()
      throw insertErr
    } finally {
      conn.release()
    }

    return NextResponse.json({
      success: true,
      importedCount: rowsToImport.length,
      skippedCount: rawRows.length - rowsToImport.length,
      summary,
    })
  } catch (err: unknown) {
    console.error('POST /api/customers/import error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to import customers'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
