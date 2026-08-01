import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorMode = 'light' | 'dark'

export function getDefaultFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startYear = month >= 3 ? year : year - 1
  const nextYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `FY ${startYear}-${nextYearShort}`
}

interface AppState {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  colorMode: ColorMode
  financialYear: string
  pageCountLabel: string | null
  setSidebarOpen: (open: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setColorMode: (mode: ColorMode) => void
  toggleColorMode: () => void
  setFinancialYear: (fy: string) => void
  setPageCountLabel: (label: string | null) => void
  clearPageCountLabel: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileSidebarOpen: false,
      colorMode: 'light',
      financialYear: getDefaultFinancialYear(),
      pageCountLabel: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setColorMode: (mode) => set({ colorMode: mode }),
      toggleColorMode: () =>
        set((state) => ({ colorMode: state.colorMode === 'dark' ? 'light' : 'dark' })),
      setFinancialYear: (fy) => set({ financialYear: fy }),
      setPageCountLabel: (label) => set({ pageCountLabel: label }),
      clearPageCountLabel: () => set({ pageCountLabel: null }),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        colorMode: state.colorMode,
        financialYear: state.financialYear,
      }),
    }
  )
)

// Invoice builder store
interface InvoiceItem {
  productId: string
  productName: string
  description: string
  quantity: number
  rate: number
  discount: number
  gstRate: number
  amount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  gstAmount: number
}

interface InvoiceBuilderState {
  items: InvoiceItem[]
  gstType: 'CGST_SGST' | 'IGST' | 'EXEMPT'
  addItem: (item: InvoiceItem) => void
  updateItem: (index: number, item: Partial<InvoiceItem>) => void
  removeItem: (index: number) => void
  clearItems: () => void
  setGstType: (type: 'CGST_SGST' | 'IGST' | 'EXEMPT') => void
  getSubtotal: () => number
  getTaxAmount: () => number
  getTotal: () => number
}

export const useInvoiceBuilder = create<InvoiceBuilderState>()((set, get) => ({
  items: [],
  gstType: 'CGST_SGST',
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (index, item) =>
    set((state) => ({
      items: state.items.map((i, idx) => (idx === index ? { ...i, ...item } : i)),
    })),
  removeItem: (index) =>
    set((state) => ({ items: state.items.filter((_, idx) => idx !== index) })),
  clearItems: () => set({ items: [] }),
  setGstType: (type) => set({ gstType: type }),
  getSubtotal: () => get().items.reduce((sum, item) => sum + item.amount, 0),
  getTaxAmount: () => get().items.reduce((sum, item) => sum + item.gstAmount, 0),
  getTotal: () => get().items.reduce((sum, item) => sum + item.amount + item.gstAmount, 0),
}))
