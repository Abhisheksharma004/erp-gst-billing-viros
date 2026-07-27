import db from './lib/db.js'
import { ensurePaymentSchema } from './lib/ensure-payment-schema.js'

async function run() {
  try {
    console.log('Running ensurePaymentSchema()...')
    await ensurePaymentSchema()
    console.log('Describing table payments...')
    const [rows] = await db.execute('DESCRIBE payments')
    console.log('Payments Table Schema:', JSON.stringify(rows, null, 2))
  } catch (err) {
    console.error('Error describing payments table:', err)
  } finally {
    process.exit(0)
  }
}

run()
