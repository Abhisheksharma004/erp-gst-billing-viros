import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { vendorSchema } from '@/lib/validations'
import { ensureVendorContactPersonColumn } from '@/lib/ensure-vendor-schema'
import { randomUUID } from 'crypto'
import { VendorImportRow, ImportValidationResult } from '@/lib/import-export-utils'

function sanitizeKey(val?: string | null): string {
  return String(val ?? '').trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('vendors', 'create')
  if (error) return error

  try {
    await ensureVendorContactPersonColumn()
    const body = await req.json()
    const action = body.action || 'preview' // 'preview' | 'import'
    const rawRows: VendorImportRow[] = Array.isArray(body.rows) ? body.rows : []
    const skipDuplicates = Boolean(body.skipDuplicates)

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 })
    }

    // Fetch existing vendors in this organization for duplicate detection
    const [existingRows] = (await db.execute(
      'SELECT id, name, contact_person, gstin, phone, mobile FROM vendors WHERE organization_id = ?',
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

    for (const v of existingRows) {
      if (v.gstin) existingGstins.set(v.gstin.trim().toUpperCase(), v.name)
      if (v.phone) existingPhones.set(v.phone.trim(), v.name)
      if (v.mobile) existingPhones.set(v.mobile.trim(), v.name)
      if (v.name) existingNames.set(sanitizeKey(v.name), v.name)
    }

    const seenGstinsInBatch = new Map<string, number>()
    const seenPhonesInBatch = new Map<string, number>()
    const seenNamesInBatch = new Map<string, number>()

    const validationResults: ImportValidationResult<VendorImportRow>[] = []
    const validRowsToInsert: VendorImportRow[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]
      const rowIndex = i + 1
      const errors: string[] = []

      // Validate against vendorSchema
      const parseResult = vendorSchema.safeParse({
        name: row.name,
        contactPerson: row.contactPerson,
        phone: row.phone,
        mobile: row.mobile || undefined,
        email: row.email || '',
        gstin: row.gstin,
        pan: row.pan || '',
        address: row.address,
        city: row.city || '',
        state: row.state || '',
        pincode: row.pincode || '',
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
        duplicateReason = `Vendor name '${row.name}' already exists in database`
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
          duplicateReason = `Duplicate Vendor Name '${row.name}' (already in Row ${seenNamesInBatch.get(nameNorm)})`
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
          `INSERT INTO vendors (id, organization_id, name, contact_person, email, mobile, phone, gstin, pan,
            address, city, state, pincode, credit_limit, opening_balance, is_active, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            row.address.trim(),
            row.city?.trim() || null,
            row.state?.trim() || null,
            row.pincode?.trim() || null,
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
    console.error('POST /api/vendors/import error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to import vendors'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
