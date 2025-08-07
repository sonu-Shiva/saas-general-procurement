import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Enable database based on DATABASE_URL environment variable
const isDatabaseEnabled = !!process.env.DATABASE_URL;

let pool: Pool | null = null;
let db: any = null;

if (isDatabaseEnabled) {
  try {
    // Configure PostgreSQL connection pool for AWS RDS
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // AWS RDS specific settings
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false // AWS RDS uses self-signed certificates
      } : undefined,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
      maxUses: 7500 // Close connection after this many uses (helps with AWS RDS connection limits)
    });

    // Initialize Drizzle ORM with the pool
    db = drizzle(pool, { schema });
    
    // Test the connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('❌ Database connection test failed:', err.message);
      } else {
        console.log('✅ Database connected successfully to AWS RDS at:', new Date(res.rows[0].now).toISOString());
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to configure database connection:', error.message);
    pool = null;
    db = null;
  }
} else {
  console.log('⚠️ DATABASE_URL not set. Database operations will be disabled.');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (pool) {
    await pool.end();
    console.log('Database pool has been closed');
  }
});

export { pool, db };