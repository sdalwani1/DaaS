import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query("select now() as time, version() as version");
console.log(rows[0]);

await pool.end();