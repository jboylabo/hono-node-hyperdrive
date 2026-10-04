import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const notes = pgTable('notes', {
  id: uuid().defaultRandom().primaryKey(),
  title: text().notNull(),
  body: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
