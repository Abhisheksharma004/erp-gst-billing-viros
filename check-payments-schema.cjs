const mysql = require('mysql2/promise')
const fs = require('fs')

async function run() {
  try {
    let host = '127.0.0.1'
    let user = 'root'
    let password = 'Rohit@12'
    let database = 'viros_erp'
    let port = 3306

    if (fs.existsSync('.env.local')) {
      const content = fs.readFileSync('.env.local', 'utf8')
      const getVal = (key) => {
        const m = content.match(new RegExp(`${key}=["']?([^"'\r\n]+)`))
        return m ? m[1] : null
      }
      if (getVal('DB_HOST')) host = getVal('DB_HOST')
      if (getVal('DB_USER')) user = getVal('DB_USER')
      if (getVal('DB_PASSWORD')) password = getVal('DB_PASSWORD')
      if (getVal('DB_NAME')) database = getVal('DB_NAME')
      if (getVal('DB_PORT')) port = Number(getVal('DB_PORT'))
    }

    console.log(`Connecting to MySQL ${host}:${port} db:${database} user:${user}...`)
    const connection = await mysql.createConnection({ host, user, password, database, port })

    const safeExec = async (sql) => {
      try {
        await connection.execute(sql)
        console.log('Executed:', sql)
      } catch (err) {
        console.log('Skipped/Warning:', sql, '->', err.message)
      }
    }

    console.log('Applying payments table migrations...')
    await safeExec('ALTER TABLE payments MODIFY COLUMN reference_id VARCHAR(36) NULL')
    await safeExec('ALTER TABLE payments ADD COLUMN organization_id VARCHAR(36) NULL AFTER id')
    await safeExec('ALTER TABLE payments ADD COLUMN payment_no VARCHAR(50) NULL AFTER organization_id')
    await safeExec("ALTER TABLE payments ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'INWARD' AFTER payment_no")
    await safeExec('ALTER TABLE payments ADD COLUMN customer_id VARCHAR(36) NULL AFTER type')
    await safeExec('ALTER TABLE payments ADD COLUMN vendor_id VARCHAR(36) NULL AFTER customer_id')
    await safeExec('ALTER TABLE payments ADD COLUMN invoice_id VARCHAR(36) NULL AFTER vendor_id')
    await safeExec('ALTER TABLE payments ADD COLUMN purchase_id VARCHAR(36) NULL AFTER invoice_id')
    await safeExec('ALTER TABLE payments ADD COLUMN bank_name VARCHAR(100) NULL AFTER reference_no')
    await safeExec('ALTER TABLE payments ADD COLUMN cheque_date DATE NULL AFTER bank_name')
    await safeExec("ALTER TABLE payments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' AFTER cheque_date")
    await safeExec('ALTER TABLE payments ADD COLUMN created_by_id VARCHAR(36) NULL AFTER notes')
    await safeExec('ALTER TABLE payments ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
    
    console.log('\nUpdated Payments Table Schema:')
    const [rows] = await connection.execute('DESCRIBE payments')
    console.table(rows)
    await connection.end()
  } catch (err) {
    console.error('Error connecting to MySQL or describing table:', err)
  }
}

run()
