import 'dotenv/config'
import { createDb } from './client.js'
import { notes } from './schema.js'

async function seed() {
  const { db, sql } = createDb()
  try {
    await db.insert(notes).values([
      { title: 'Hello', body: 'First note from seed' },
      { title: 'Drizzle', body: 'PostgreSQL on Docker' },
      { title: 'Hono', body: 'Node server with Hyperdrive path' },
      { title: 'Migration', body: 'Generated SQL applied via drizzle-kit' },
      { title: 'Studio', body: 'Browse rows with pnpm db:studio' },
    ])
    console.log('Seeded 5 notes')
  } finally {
    await sql.end()
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
