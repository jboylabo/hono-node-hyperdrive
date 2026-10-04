# メンターレビュー — Biome 導入 PR（練習用）

> このファイルは **PR 作成の練習用メモ**です。メンター視点で「推奨する設定・進め方」を残しています。
> マージ後に残してもよいですが、チームに共有する必要がなければ削除して構いません。

---

## この PR の位置づけ

| 項目 | 内容 |
|---|---|
| ブランチ | `feat/biome` → `main` |
| 目的 | Biome 2.x を導入し、lint / format / assist の土台を作る |
| 性質 | **学習・練習 PR**。本番運用の完成形ではなく「正しい導入手順の実践」 |

---

## 現状評価（メンター所見）

### よくできている点

1. **既存コードのスタイルに合わせてから `--write` した**
   - いきなり `biome format --write` せず、Step 3 の formatter 設定を先に入れたのは正解。
   - `src/` がほぼ触られない状態で設定ファイルだけ整形できている。

2. **`useHtmlLang` をルール off ではなくコード修正で解決**
   - `<html lang="ja">` はアクセシビリティ上も正しい。ルールを黙らせるより優先。

3. **`@biomejs/biome` を exact pin（`2.5.15`）**
   - チーム全員・CI で同じ Biome バージョンが動く。学習中は特に重要。

4. **学習ドキュメント（`docs/biome/`）を同梱**
   - 「なぜこの設定か」を後から追える。PR の説明にも使える。

### 改善推奨（この PR か次コミットで）

| 優先度 | 項目 | 推奨 | 理由 |
|---|---|---|---|
| 高 | `package.json` スクリプト | Step 5 の 7 本を追加 | `pnpm check` / `pnpm ci` をチーム共通の入口にする |
| 高 | `files.includes` | 生成物・ビルド成果物を除外 | 将来 `dist/` や `.wrangler/` ができても検査対象に入らない |
| 中 | `$schema` | ローカル path を使う | Cursor / VS Code で schema ダウンロードが off でも補完が効く |
| 中 | `linter.domains.project` | `"recommended"` | 存在しない export の import など、プロジェクト横断の検査 |
| 低 | `lineWidth` | `100` か `120` をチームで一度決める | 教材は 100、現状 120。**どちらでもよいが、理由を PR に書く** |
| 低 | コミット分割 | 設定追加 / 整形 / ドキュメントを分ける | 練習 PR では 1 コミットでも可。実務では分ける |

---

## 推奨する `biome.json` の考え方

### 1. 設定の優先順位

```
① 既存コードを壊さない（formatter を先に合わせる）
② 検査対象を絞る（files / vcs）
③ 日常コマンドを scripts に載せる
④ ルールは recommended から始め、必要なときだけ off / warn
```

**ルールを最初から緩めるのは非推奨。** `recommended` で一度全部見て、本当に合わないものだけ切る。

### 2. このプロジェクト固有

| 設定 | 推奨値 | 理由 |
|---|---|---|
| `javascript.jsxRuntime` | `"transparent"` | Hono JSX。React Classic ではない |
| `linter.domains.react` | **有効にしない** | React 依存が無い。誤検知の元 |
| `assist.actions.source.organizeImports` | `"on"` | `"none"` は無効。**off にするなら `"off"`** |
| `vcs.useIgnoreFile` | `true` | `.gitignore` と二重管理を避ける（`.gitignore` 必須） |

### 3. `$schema` について

`biome init` が書く URL は正しいが、エディタによっては取得できない。

```json
"$schema": "./node_modules/@biomejs/biome/configuration_schema.json"
```

CLI には影響しない。**エディタ補完用のローカル path** として推奨。

---

## 推奨する `package.json` scripts

```json
"lint": "biome lint .",
"lint:fix": "biome lint --write .",
"format": "biome format .",
"format:write": "biome format --write .",
"check": "biome check .",
"check:write": "biome check --write .",
"biome:ci": "biome ci ."
```

| スクリプト | いつ使う |
|---|---|
| `pnpm check` | **日常の確認**（書き込みなし） |
| `pnpm check:write` | ローカルで一括修正 |
| `pnpm biome:ci` | **CI 専用**（絶対に書き込まない） |

**CI では `check --write` を使わない。** `biome ci` サブコマンドは `--write` フラグ自体が存在しない。

> ⚠️ **pnpm / npm の落とし穴**: スクリプト名を `"ci"` にすると `pnpm ci` / `npm ci` は **Biome ではなく lockfile からのクリーン install** が走ります。教材の `"ci"` は npm/yarn 向けの慣習で、pnpm では **`biome:ci` など別名にする**のが安全です。

---

## 推奨コミット戦略（実務）

練習 PR では 1 コミットでもよいが、実務では次の 3 分割を推奨:

```text
1. chore: add @biomejs/biome and biome.json
2. style: apply biome formatting to config files
3. docs: add biome learning materials
```

整形コミットは `.git-blame-ignore-revs` に登録すると `git blame` が読みやすくなる。

---

## PR 本文テンプレート（コピペ用）

```markdown
## Summary

- Biome 2.5.15 を devDependency として追加
- `biome.json` で既存コードスタイル（space 2 / single quote / no semicolons）に合わせて formatter を設定
- `src/renderer.tsx` に `lang="ja"` を追加（a11y）
- 設定ファイル（`package.json`, `tsconfig.json` 等）を Biome で整形
- 学習用ドキュメントを `docs/biome/` に追加

## 設定方針（メンター推奨）

- 既存プロジェクトへの導入なので、**Biome デフォルトではなく既存スタイルに合わせた**
- lint は `recommended` から開始。ルール off は最小限
- Hono JSX のため `react` domain は使わない
- `pnpm check` / `pnpm ci` で日常確認と CI を分離（scripts 追加後）

## Test plan

- [ ] `pnpm install`
- [ ] `pnpm exec biome check .` → エラー 0
- [ ] `pnpm dev` でアプリが起動する
- [ ] （scripts 追加後）`pnpm check` / `pnpm biome:ci` が通る

## 意図的に今回やっていないこと

- VS Code 拡張・保存時整形（`.vscode/settings.json`）
- GitHub Actions CI
- lefthook / husky の pre-commit
- Drizzle domain（別ブランチ合流後に検討）
```

---

## マージ前チェックリスト

- [ ] `pnpm exec biome check .` がエラー 0
- [ ] `biome.json` に `files.includes` でビルド成果物除外がある
- [ ] `package.json` に `check` / `biome:ci` スクリプトがある
- [ ] PR 本文に「なぜ既存スタイルに合わせたか」が書いてある
- [ ] `useHtmlLang` を off にしていない（コード修正で解決している）

---

## 次の PR でやるとよいこと

1. **GitHub Actions** — `pnpm biome:ci` を PR ごとに実行
2. **エディタ設定** — `biomejs.biome` 拡張 + 保存時 `source.fixAll.biome`
3. **pre-commit** — `biome check --write --staged`（ステージ済みだけ）
4. **Drizzle 合流時** — `linter.domains.drizzle: "recommended"` の検討

---

## 参考

- 手順書: [02-setup-handson.md](./02-setup-handson.md)
- 教材と違うエラー: [02-setup-handson.md の補足](./02-setup-handson.md#補足--教材と違うエラーが出たとき)
- 完成形 config: [02-setup-handson.md Step 8](./02-setup-handson.md#step-8--完成形の-biomejson)
