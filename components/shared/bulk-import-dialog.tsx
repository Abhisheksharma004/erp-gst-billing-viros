'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  CopyX,
  Loader2,
  X,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import {
  parseUploadedFile,
  mapToCustomerImportRow,
  mapToVendorImportRow,
  ImportValidationResult,
  CustomerImportRow,
  VendorImportRow,
} from '@/lib/import-export-utils'

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  entityType: 'customer' | 'vendor'
  importEndpoint: string
  onDownloadTemplate: () => void
  onSuccess: () => void
}

export function BulkImportDialog({
  open,
  onOpenChange,
  title,
  entityType,
  importEndpoint,
  onDownloadTemplate,
  onSuccess,
}: BulkImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const [parsedRows, setParsedRows] = useState<(CustomerImportRow | VendorImportRow)[]>([])
  const [previewRows, setPreviewRows] = useState<ImportValidationResult<CustomerImportRow | VendorImportRow>[]>([])
  const [summary, setSummary] = useState<{
    total: number
    valid: number
    duplicateDb: number
    duplicateFile: number
    invalid: number
  } | null>(null)

  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
  } | null>(null)

  const resetState = () => {
    setStep('upload')
    setSelectedFile(null)
    setIsLoading(false)
    setIsImporting(false)
    setParsedRows([])
    setPreviewRows([])
    setSummary(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    await processFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    const validExts = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      toast({
        title: 'Invalid file format',
        description: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setIsLoading(true)

    try {
      const rawRecords = await parseUploadedFile(file)
      if (rawRecords.length === 0) {
        toast({
          title: 'Empty File',
          description: 'No data rows found in the uploaded file.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      const rows =
        entityType === 'customer'
          ? rawRecords.map(mapToCustomerImportRow)
          : rawRecords.map(mapToVendorImportRow)

      setParsedRows(rows)

      // Request preview validation from backend
      const res = await fetch(importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          rows,
          skipDuplicates,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to validate file')
      }

      setSummary(result.summary)
      setPreviewRows(result.previewRows)
      setStep('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing file'
      toast({
        title: 'Validation Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteImport = async () => {
    if (!summary || summary.valid === 0) {
      toast({
        title: 'No valid records',
        description: 'There are no valid records ready to be imported.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)

    try {
      const res = await fetch(importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          rows: parsedRows,
          skipDuplicates,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Import failed')
      }

      setImportResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
      })
      setStep('completed')
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${data.importedCount} ${entityType}(s).`,
      })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import data'
      toast({
        title: 'Import Failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* STEP 1: UPLOAD ZONE */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border text-sm">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Need the correct column format?</p>
                <p className="text-xs text-muted-foreground">
                  Download the sample template with all valid columns and example rows.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={onDownloadTemplate}
              >
                <Download className="w-4 h-4 text-primary" />
                Download Format Template
              </Button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3 flex flex-col items-center justify-center min-h-[200px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="font-medium text-sm">Analyzing and validating file data...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-base">
                      Click to upload or drag & drop file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & VALIDATION RESULTS */}
        {step === 'preview' && summary && (
          <div className="space-y-4 py-1 flex-1 overflow-hidden flex flex-col">
            {/* Badges Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
              <div className="p-2.5 bg-muted rounded-lg border flex flex-col">
                <span className="text-muted-foreground text-xs">Total Records</span>
                <span className="font-bold text-base sm:text-lg">{summary.total}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 rounded-lg flex flex-col">
                <span className="text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Import
                </span>
                <span className="font-bold text-emerald-800 dark:text-emerald-200 text-base sm:text-lg">
                  {summary.valid}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 rounded-lg flex flex-col">
                <span className="text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1 font-medium">
                  <CopyX className="w-3.5 h-3.5" /> Duplicates
                </span>
                <span className="font-bold text-amber-800 dark:text-amber-200 text-base sm:text-lg">
                  {summary.duplicateDb + summary.duplicateFile}
                </span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 dark:bg-rose-950 dark:border-rose-800 rounded-lg flex flex-col">
                <span className="text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Invalid Records
                </span>
                <span className="font-bold text-rose-800 dark:text-rose-200 text-base sm:text-lg">
                  {summary.invalid}
                </span>
              </div>
            </div>

            {/* Skip duplicates toggle */}
            {(summary.duplicateDb > 0 || summary.duplicateFile > 0) && (
              <div className="flex items-center space-x-2 bg-amber-50/60 dark:bg-amber-950/40 p-2.5 rounded-md border border-amber-200/60">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(Boolean(checked))}
                />
                <Label
                  htmlFor="skipDuplicates"
                  className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 cursor-pointer"
                >
                  Skip duplicate records and import only valid new records ({summary.valid} ready)
                </Label>
              </div>
            )}

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border rounded-md max-h-[340px]">
              <Table>
                <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">#</TableHead>
                    <TableHead className="w-28 text-xs">Status</TableHead>
                    <TableHead className="text-xs">{entityType === 'customer' ? 'Customer' : 'Vendor'} Name</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">GSTIN</TableHead>
                    <TableHead className="text-xs">Notes / Error Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={
                        row.status === 'invalid'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : row.status === 'duplicate_db' || row.status === 'duplicate_file'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : undefined
                      }
                    >
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {row.rowIndex}
                      </TableCell>
                      <TableCell>
                        {row.status === 'valid' && (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 text-[11px]">
                            Ready
                          </Badge>
                        )}
                        {row.status === 'duplicate_db' && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 text-[11px]">
                            Existing Duplicate
                          </Badge>
                        )}
                        {row.status === 'duplicate_file' && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 text-[11px]">
                            File Duplicate
                          </Badge>
                        )}
                        {row.status === 'invalid' && (
                          <Badge variant="destructive" className="text-[11px]">
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {row.data.name || <span className="text-destructive">Missing Name</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.data.phone || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.data.gstin || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.duplicateReason && (
                          <p className="text-amber-700 dark:text-amber-300 font-medium">
                            {row.duplicateReason}
                          </p>
                        )}
                        {row.errors.length > 0 && (
                          <ul className="text-destructive list-disc list-inside space-y-0.5">
                            {row.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                        {row.status === 'valid' && (
                          <span className="text-muted-foreground text-[11px]">Valid entry</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETED CONFIRMATION */}
        {step === 'completed' && importResult && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Import Completed Successfully!</h3>
              <p className="text-muted-foreground text-sm">
                Added <span className="font-semibold text-foreground">{importResult.importedCount}</span> new {entityType}(s) to your list.
              </p>
              {importResult.skippedCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {importResult.skippedCount} duplicate or invalid row(s) were skipped.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t pt-3 mt-auto">
          {step === 'upload' && (
            <div className="flex justify-end w-full">
              <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('upload')}
                disabled={isImporting}
              >
                Choose Different File
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={isImporting || !summary || summary.valid === 0}
                onClick={handleExecuteImport}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {summary?.valid || 0} Record(s)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'completed' && (
            <div className="flex justify-end w-full">
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
