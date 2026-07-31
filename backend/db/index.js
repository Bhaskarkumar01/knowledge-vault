// Chooses the active database driver at boot time. Both drivers expose the
// same interface: get(sql, params), all(sql, params), run(sql, params),
// searchItems({ userId, query, folderId, type }), and `dialect`.
//
// Route code is written once against this shared interface and works
// unchanged against either backend - see db/sqlite.js and db/postgres.js.

const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

let driver;
if (client === 'postgres' || client === 'postgresql' || client === 'pg') {
  driver = await import('./postgres.js');
} else {
  driver = await import('./sqlite.js');
}

export const dialect = driver.dialect;
export const get = driver.get;
export const all = driver.all;
export const run = driver.run;
export const searchItems = driver.searchItems;

export default driver.default;
