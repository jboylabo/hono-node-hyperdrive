# Biome 学習ドキュメント

このフォルダは **Biome を体系的に理解して、仕事でも使える lint / format 設定を自分で組めるようになる**ための学習用ドキュメントです。

対象バージョンは **Biome 2.5.15**（このプロジェクトにインストール済みのもの）。
Biome は 1.x → 2.x で設定の形が大きく変わっているため、ネット上の記事を読むときは必ずバージョンを確認してください。

---

## 読む順序

| # | ファイル | 役割 | 読み方 |
|---|---|---|---|
| 1 | [01-overview.md](./01-overview.md) | Biome とは何か / ESLint + Prettier との関係 / v2 の設計 | **通読する**（15分） |
| 2 | [02-setup-handson.md](./02-setup-handson.md) | **手順書。実際に手を動かして設定を完成させる** | **手を動かす**（60分） |
| 3 | [03-config-reference.md](./03-config-reference.md) | `biome.json` の全セクション辞書 | **引く**（必要なときに） |
| 4 | [04-cli-reference.md](./04-cli-reference.md) | CLI コマンド・フラグ辞書 | **引く**（必要なときに） |
| 5 | [05-linter-rules.md](./05-linter-rules.md) | ルールの運用 / domains / 抑制コメント / 既存プロジェクトへの段階的導入 | **通読する**（20分） |
| 6 | [99-cheatsheet.md](./99-cheatsheet.md) | 1画面の早見表 | **貼っておく** |

最短ルートは **01 → 02** です。03 と 04 は辞書なので最初から全部読む必要はありません。
「仕事で導入するときどうするか」だけ知りたいなら **05 の後半「既存プロジェクトへの段階的導入」**だけ読めば足ります。

---

## このプロジェクトの現状

Biome は **`feat/biome` ブランチで導入済み**です。ハンズオン Step 3〜8 相当まで完了しています。

| 項目 | 現状 |
|---|---|
| Biome バージョン | `2.5.15`（`package.json` で exact pin） |
| `biome.json` | あり（formatter / linter / assist / files 除外 設定済み） |
| `package.json` scripts | `check` / `check:write` / `biome:ci` など 7 本 |
| ESLint / Prettier | 無し（移行作業は不要） |
| スタック | Hono + JSX SSR on Cloudflare Workers + Vite 8 |
| 既存コードのスタイル | シングルクォート / セミコロンなし / スペース 2 |

```console
$ pnpm check
```

→ エラー 0 が期待値です。

**PR 作成の練習**をする場合は [PR-MENTOR-NOTES.md](./PR-MENTOR-NOTES.md)（メンター視点の推奨設定・PR 本文テンプレート）を参照してください。

まだ Biome を入れていない状態から始める場合は、以下の「出発点」を参考に [02-setup-handson.md](./02-setup-handson.md) を進めてください。

<details>
<summary>出発点（Biome 未導入時）</summary>

- **7 ファイルが未フォーマット** … `package.json` / `src/` / `tsconfig.json` 等
- **lint エラー 1 件** … `lint/a11y/useHtmlLang` @ `src/renderer.tsx`
- 合計 **8 errors**

</details>

> **注意**: Biome のデフォルトは **タブ / ダブルクォート / セミコロンあり / 行幅 80** です。
> 一方このプロジェクトの既存コードは **スペース 2 / シングルクォート / セミコロンなし**。
> 何も設定せずに `biome format --write` すると**既存ファイルが全部書き換わります**。
> 手順書では既存スタイルに合わせる設定を先に入れてから適用します。

---

## このプロジェクト特有の注意点

### 1. React ではない（Hono JSX）

`tsconfig.json` の `jsxImportSource` は `hono/jsx` です。JSX を書いていても React ではありません。

- Biome の **`react` domain は有効にしない**でください（`useExhaustiveDependencies` など React フック前提のルールが誤検知します）
- domain は `package.json` の依存から**自動で有効になる**仕様ですが、`react` が依存に無いのでこのプロジェクトでは自動では付きません
- `javascript.jsxRuntime` は `"transparent"`（モダンな JSX ランタイム）のままで正しい。`"reactClassic"` は使いません

### 2. Cloudflare Workers 上で動く

Node ランタイム前提ではありません。`process.env` を前提にしたコードは Workers では動かないので、
`style/noProcessEnv` ルールが有効なのは**むしろ都合がよい**と考えられます。
逆に Workers 固有のグローバル（`caches`、`WebSocketPair` など）を使って
「未定義の変数」と怒られたら `javascript.globals` に追加します（→ [03](./03-config-reference.md)）。

### 3. Drizzle が別ブランチで待っている

このリポジトリ名は `drizzle-hono-app` で、別ブランチに Drizzle ORM が入っています。
**Biome 2.5 には `drizzle` domain があります**（`drizzle-orm` の `where` 無し `delete` / `update` を検出するなど）。
Drizzle が合流したタイミングで `linter.domains.drizzle` を有効化する候補として覚えておいてください。
詳細は [05-linter-rules.md の domains](./05-linter-rules.md#domains--フレームワーク単位のルール束) を参照。

---

## この先（今回のドキュメントの範囲外）

以下は今回は扱っていません。必要になったら個別に追えば十分です。

- **エディタ連携** … VS Code 拡張 `biomejs.biome` を入れて `editor.defaultFormatter` と `source.fixAll.biome` を設定する。なお現状 `.gitignore` が `.vscode/*` を除外しているので、`.vscode/settings.json` をコミットしたい場合は `!.vscode/settings.json` の追記が必要。
- **CI** … GitHub Actions で `biome ci . --reporter=github` を回すと PR にアノテーションが出る。
- **コミット前チェック** … lefthook / husky + `biome check --write --staged` で、ステージ済みファイルだけ整形する。
