
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthguard_ai',

  ssl: process.env.DB_HOST
    ? {
        ca: fs.readFileSync(
          path.join(__dirname, '../../certs/ca.pem')
        ),
        rejectUnauthorized: true
      }
    : undefined,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  decimalNumbers: true
});

module.exports = pool;
