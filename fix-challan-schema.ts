import db from './lib/db'

async function fix() {
  try {
    await db.execute('ALTER TABLE challan_items MODIFY COLUMN product_id VARCHAR(36) NULL')
    console.log('product_id is now nullable in challan_items')
  } catch (e: any) {
    console.error('Error:', e.message)
  }
  process.exit(0)
}

fix()
