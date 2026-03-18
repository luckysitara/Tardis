const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db.sqlite');
console.log('Connecting to DB at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('--- Checking for product listings in DB ---');
  
  db.all("SELECT id, content, author_wallet_address FROM posts LIMIT 5", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log(`Found ${rows.length} total posts (showing first 5):`);
    rows.forEach(p => {
      console.log(`- Post ${p.id} by ${p.author_wallet_address.slice(0, 8)}...: "${p.content.substring(0, 50)}..."`);
    });
  });

  db.all("SELECT id, content, author_wallet_address FROM posts WHERE content LIKE '%solana-action%' OR content LIKE '%Solana-Action%'", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log(`\nQuery for 'solana-action' returned ${rows.length} posts.`);
    rows.forEach(l => {
      console.log(`- Listing found! Post ${l.id} by ${l.author_wallet_address.slice(0, 8)}...`);
      console.log(`  Content: ${l.content}`);
    });
    
    db.close();
  });
});
