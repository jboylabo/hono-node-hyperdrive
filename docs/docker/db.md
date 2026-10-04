# 前回の詰まりどころからの構築
**PostgreSQL + Docker + Drizzle は正しい方向です。** 前回の `feat/drizzle_pg` を見ると、パッケージだけ入れて（`pg`, `drizzle-orm`, `drizzle-kit`）、**schema / docker-compose / 接続コード / マイグレーションが無い**状態で止まっていました。ここが「失敗」の正体だと思います。

加えて、このプロジェクトは **Cloudflare Workers 上の Hono** なので、`pg`（node-postgres）をそのまま Worker に載せようとすると詰まりやすいです。Workers は Node の TCP ソケット前提のドライバと相性が悪いからです。

---

## 学習サンプルの設計方針

**一度に全部やらない。** 3 段階に分けるのが安全です。

```
Phase 1: Docker + Drizzle 単体     ← まずここだけ成功させる
Phase 2: Hono API から DB を叩く   ← ローカル dev
Phase 3: Workers 本番接続           ← Hyperdrive 等（後回しで OK）
```

Phase 1 が通れば Drizzle の本質（schema / migration / query）は学べます。Phase 3 は「仕事に近い」話ですが、最初からやると失敗原因の切り分けが難しくなります。

---

## 推奨ディレクトリ構成

```text
drizzle-hono-app/
├── docker-compose.yml          # PostgreSQL 16
├── .env.example                # DATABASE_URL=postgres://...
├── drizzle.config.ts
├── drizzle/                    # 生成された migration SQL
├── src/
│   ├── db/
│   │   ├── schema.ts           # テーブル定義
│   │   ├── client.ts           # Drizzle クライアント
│   │   └── seed.ts             # 初期データ
│   ├── routes/
│   │   └── notes.ts            # CRUD API（Phase 2）
│   └── index.tsx
└── package.json scripts
```

---

## Phase 1 — Docker + Drizzle だけ（最初のゴール）

### docker-compose.yml（最小）

```yaml
services:
  db:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### サンプルドメイン（1 テーブルで十分）

最初は **`notes`** だけで OK です。

| カラム | 型 | 備考 |
|---|---|---|
| `id` | `uuid` PK | `defaultRandom()` |
| `title` | `text` | |
| `body` | `text` | nullable |
| `created_at` | `timestamptz` | `defaultNow()` |

PostgreSQL らしさ（UUID、timestamptz）が学べて、CRUD もシンプルです。

### package.json scripts（Phase 1）

```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:seed": "tsx src/db/seed.ts"
```

### Phase 1 の成功条件

```console
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio    # ブラウザで notes が見える
```

**Hono は触らない。** ここまで通れば Phase 1 完了です。

---

## Phase 2 — Hono API 連携

```text
GET    /api/notes      → 一覧
GET    /api/notes/:id
POST   /api/notes      → 作成
DELETE /api/notes/:id
```

### ドライバの選び方（前回の失敗ポイント）

| ドライバ | 用途 | このプロジェクト |
|---|---|---|
| `pg` (node-postgres) | Node 専用 | ❌ Workers 向きではない |
| `postgres` (postgres.js) | Edge / Hyperdrive 対応 | ✅ ローカル + 本番両方 |
| `@neondatabase/serverless` | HTTP 経由 | Neon 使うなら |

**学習用ローカル dev では `postgres`（postgres.js）を推奨**します。`pg` ではなくこちらを入れ直すのがポイントです。

### Phase 2 実装済み（2026-10-04）

| ファイル | 内容 |
|---|---|
| `src/routes/notes.ts` | GET / POST / DELETE CRUD |
| `src/index.tsx` | `app.route('/api/notes', notesRoute)`（renderer の**前**にマウント） |
| `wrangler.jsonc` | `nodejs_compat` フラグ |
| `.dev.vars.example` | Workers ローカル dev 用 `DATABASE_URL` |

**Workers では DB 接続をリクエストごとに作る。** モジュール直下の singleton `db` だと 2 リクエスト目以降で `Cannot perform I/O on behalf of a different request` になる。`createDb()` + middleware で `sql.end()` すること。

```ts
// src/db/client.ts
export function createDb() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
  return { db: drizzle(sql, { schema }), sql }
}
```

### Phase 2 完了チェックリスト

```console
cp .dev.vars.example .dev.vars   # drizzle-kit 用 .env とは別
pnpm db:up
pnpm dev

curl http://localhost:5173/api/notes
curl http://localhost:5173/api/notes/<id>
curl -X POST http://localhost:5173/api/notes -H 'Content-Type: application/json' -d '{"title":"test"}'
curl -X DELETE http://localhost:5173/api/notes/<id>
```

4 エンドポイントすべて JSON が返れば Phase 2 完了。

---

## Phase 3 — Workers 本番（後で OK）

Cloudflare Workers から外部 PostgreSQL へは **Hyperdrive** が定番です。

```text
[Browser] → [Workers/Hono] → [Hyperdrive] → [Docker PG / RDS / Neon]
                                    ↑
                              接続プール・再利用
```

学習の最初の段階では **Phase 3 はスキップして問題ありません。** 「Docker PG で Drizzle を学ぶ」と「Workers デプロイ」は別スキルです。

---

## ブランチ戦略（練習 PR 向け）

| ブランチ | 内容 | PR |
|---|---|---|
| `feat/docker-db` | docker-compose のみ | PR 1 |
| `feat/drizzle-schema` | schema + migrate + seed | PR 2 |
| `feat/drizzle-api` | Hono CRUD | PR 3 |

1 PR = 1 つの学習テーマ。前回は全部まとめて `drizzle-orm` を入れただけだったので、動くところまで到達できませんでした。

---

## SQLite にしない理由（その感覚は正しい）

| | SQLite | PostgreSQL (Docker) |
|---|---|---|
| 型 | 簡素 | uuid, jsonb, timestamptz, enum |
| マイグレーション | 差がある | 実務と同じ |
| 接続 | ファイル | URL + プール（仕事に近い） |
| Cloudflare | D1 と混同しやすい | Hyperdrive / Neon へ自然に繋がる |

---

## メンターからの最初の一歩

今日やるなら **Phase 1 だけ** です。

1. `feat/docker-db` ブランチを切る
2. `docker-compose.yml` + `.env.example` を追加
3. `docker compose up -d` で PostgreSQL 起動確認
4. `drizzle.config.ts` + `src/db/schema.ts`（notes 1 テーブル）
5. `db:generate` → `db:migrate` → `db:seed` → `db:studio`

**Hono 連携は Phase 1 が通ってから。** 前回はここを飛ばして `pg` を入れただけだったので、動かないのは自然です。

---

Agent モードに切り替えてもらえれば、Phase 1 のファイル一式をこのプロジェクト向けに作れます。まず Phase 1 から進めますか？