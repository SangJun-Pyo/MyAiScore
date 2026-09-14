import { getStore, purgeExpired } from '../src/server/web/store.js';
try {
  const removed = await getStore().transaction(db => {
    const before = Object.keys(db.assessments).length;
    purgeExpired(db, Date.now());
    return before - Object.keys(db.assessments).length;
  });
  console.log(JSON.stringify({ removed }));
} catch { console.error('Assessment cleanup failed. Check storage configuration.'); process.exitCode = 1; }
