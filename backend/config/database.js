import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host: process.env.PG_HOST,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      port: Number(process.env.PG_PORT),
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    };

export const pool = new Pool(poolConfig);