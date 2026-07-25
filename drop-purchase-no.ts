import mysql from 'mysql2/promise';

async function dropPurchaseNo() {
  const poolOptions: mysql.PoolOptions = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'viros_web_new',
    port: Number(process.env.DB_PORT ?? 3306),
  };
  const pool = mysql.createPool(poolOptions);

  try {
    console.log('Dropping purchase_no from purchases...');
    await pool.execute('ALTER TABLE purchases DROP COLUMN purchase_no');
    console.log('Successfully dropped purchase_no from purchases table.');
  } catch (err: any) {
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('Column purchase_no already dropped.');
    } else {
      console.error('Failed to drop purchase_no:', err);
    }
  }

  await pool.end();
}

dropPurchaseNo();
