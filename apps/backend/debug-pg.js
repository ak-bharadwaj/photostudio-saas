
const { Client } = require('pg');
require('dotenv').config();

async function test() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    try {
        console.log('Connecting to PG...');
        await client.connect();
        console.log('Connected to PG!');
        const res = await client.query('SELECT current_user, now()');
        console.log('Result:', res.rows[0]);
    } catch (e) {
        console.error('PG ERROR:', e);
    } finally {
        await client.end();
    }
}

test();
