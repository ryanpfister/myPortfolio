#!/usr/bin/env node
// CLI helper — generate a bcrypt hash for ADMIN_PASSWORD_HASH.
// Usage:  node hash.js "your real password"

const bcrypt = require('bcrypt');
const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node hash.js "your-password"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 10);
console.log('\nPaste this into your .env as ADMIN_PASSWORD_HASH:\n');
console.log(hash + '\n');
