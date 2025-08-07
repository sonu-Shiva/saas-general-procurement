import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Disable database in development mode to prevent connection issues
const isDatabaseEnabled = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL;

let pool: Pool | null = null;
let db: any = null;

if (isDatabaseEnabled) {
  try {
    neonConfig.webSocketConstructor = ws;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
    db = drizzle({ client: pool, schema });
    console.log('✅ Database connection configured for production');
  } catch (error) {
    console.warn('⚠️ Failed to configure database connection:', error.message);
    pool = null;
    db = null;
  }
} else {
  console.log('🔧 Development mode: Database disabled for stability. All data operations will return empty results.');
}

export { pool, db };