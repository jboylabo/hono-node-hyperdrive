# 99. Biome 早見表

Biome 2.5.15 / このプロジェクト用。**1 画面で引けるように詰めています。**

---

## 日常のコマンド

```console
$ pnpm check          # 検査（format + lint + assist）← 一番使う
$ pnpm check:write    # 一括修正 ← 二番目に使う
$ pnpm ci             # CI 用。絶対に書き込まない

$ pnpm lint           # lint だけ
$ pnpm format         # 整形だけ
```

```console
# ルールを調べる（ドキュメントを探すより速い）
$ pnpm exec biome explain useHtmlLang

# 全体像だけ見る
$ pnpm exec biome check . --reporter=summary

# 上限 20 件を外す
$ pnpm exec biome check . --max-diagnostics=none

# 1 ルールだけ試す（off のルールも一時的に有効化される）
$ pnpm exec biome lint --only=style/useConst .

# 危険な修正まで適用（手で git diff を読むときだけ）
$ pnpm exec biome check --write --unsafe .

# ステージ済みファイルだけ（ローカル）
$ pnpm exec biome check --write --staged

# 変更分だけ（CI）
$ pnpm exec biome ci --changed --since=origin/main

# 保存ごとに再検査
$ pnpm exec biome check --watch .

# 遅い原因を調べる
$ pnpm exec biome check . --profile-rules
```

---

## コマンドの使い分け

| | format | lint | assist | `--write` | `--staged` | `--suppress` |
|---|---|---|---|---|---|---|
| `format` | ✅ | | | ✅ | ✅ | |
| `lint` | | ✅ | | ✅ | ✅ | **✅** |
| **`check`** | ✅ | ✅ | ✅ | ✅ | ✅ | |
| **`ci`** | ✅ | ✅ | ✅ | **❌** | **❌** | |

**迷ったら `check`。CI は `ci`。**

---

## `biome.json` スケルトン（このプロジェクトの完成形）

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!**/dist", "!**/.wrangler", "!**/drizzle/**/*.sql"],
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": { "preset": "recommended" },
    "domains": { "project": "recommended" }
  },
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  },
  "javascript": {
    "jsxRuntime": "transparent",
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "asNeeded",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  },
  "json": { "formatter": { "trailingCommas": "none" } }
}
```

---

## 重大度 5 値

| 値 | 意味 | CI を止めるか |
|---|---|---|
| `"off"` | 無効 | — |
| `"on"` | ルール既定の重大度 | ルール次第 |
| `"error"` | エラー | **止まる** |
| `"warn"` | 警告 | 止まらない（`--error-on-warnings` で止まる） |
| `"info"` | 情報 | **常に止まらない** |

**導入は `info` → `warn` → `error` と昇格させる。**

---

## ルールグループ（557 ルール）

| グループ | 数 | 既定 | 中身 |
|---|---:|---|---|
| `correctness` | 99 | error | **確実に間違い。** 未使用変数、到達不能コード |
| `suspicious` | 120 | error | **たぶん間違い。** `any`、`debugger` |
| `complexity` | 50 | error | 無駄に複雑 |
| `style` | 99 | **warn** | 一貫性・慣用表現 |
| `a11y` | 38 | error | アクセシビリティ |
| `performance` | 15 | error | 実行時効率 |
| `security` | 6 | error | セキュリティ |
| `nursery` | 130 | **オプトイン** | 不安定な新ルール |

```jsonc
"rules": {
  "preset": "recommended",   // recommended / all / none
  "style": {
    "preset": "none",                  // グループ単位で上書き
    "useConst": "error",               // 個別ルール
    "noMagicNumbers": {                // オプション付き
      "level": "warn",
      "fix": "none"                    // none / safe / unsafe
    }
  }
}
```

---

## domains（15 個）

```jsonc
"linter": { "domains": { "project": "recommended" } }   // all / recommended / none
```

| ドメイン | 有効化条件 | このプロジェクト |
|---|---|---|
| `project` | 常に判定 | ✅ **`recommended`** |
| `types` | 常に判定 | ⏸ 後で試す（型推論。重い） |
| `test` | vitest / jest / mocha / ava | ⏸ テストを書いたら |
| **`react`** | `react` ≥16 | ❌ **使わない（Hono JSX）** |
| **`drizzle`** | `drizzle-orm` ≥0.9 | 📌 **合流したら `recommended`** |
| `next` `vue` `svelte` `solid` `qwik` `astro` `reactNative` `tailwind` `playwright` `turborepo` | 各依存 | ❌ 該当なし |

**`package.json` の依存から自動で有効になる。** domain のルールは多くが `nursery` 所属だが、
**domain 経由での有効化は正式な使い方**。

---

## 抑制コメント

```ts
// biome-ignore lint/suspicious/noExplicitAny: 外部 API の型が不定
// biome-ignore-all lint/style/noDefaultExport: 設定ファイル    ← ファイル先頭のみ
// biome-ignore-start lint/style/useNamingConvention: 理由
// biome-ignore-end   lint/style/useNamingConvention
// biome-ignore format: 手で整列させた表
```

- **理由は必須。** 書かないと Biome がエラーにする
- カテゴリ: `lint` / `assist` / `syntax` / `format`
- 粒度: `lint` → `lint/suspicious` → `lint/suspicious/noDebugger`（**一番細かいものを使う**）
- JSX 内は `{/* biome-ignore ... */}`、CSS / JSON は `/* ... */`
- 不要になった抑制は `suppression/unused` で教えてくれる

---

## よく変える formatter オプション

| キー | 既定 | このプロジェクト |
|---|---|---|
| `formatter.indentStyle` | **`tab`** | `space` |
| `formatter.indentWidth` | `2` | `2` |
| `formatter.lineWidth` | **`80`** | `100` |
| `formatter.lineEnding` | `lf` | `lf` |
| `formatter.expand` | `auto` | （既定） |
| `javascript.formatter.quoteStyle` | **`double`** | `single` |
| `javascript.formatter.jsxQuoteStyle` | `double` | `double` |
| `javascript.formatter.semicolons` | **`always`** | `asNeeded` |
| `javascript.formatter.trailingCommas` | `all` | `all` |
| `javascript.formatter.arrowParentheses` | `always` | `always` |
| `json.formatter.trailingCommas` | `none` | `none` |

**太字が Biome のデフォルト。既存コードと食い違うのはこの 4 つ。**

---

## 既存プロジェクトへの導入（順番）

```
1. biome migrate prettier --write / migrate eslint --write   ← 整形スタイルを変えない
2. biome format --write .  →  整形だけの単独コミット
   （ハッシュを .git-blame-ignore-revs に追記）
3. linter.rules.preset = "recommended"   ← "all" は使わない
4. biome lint . --reporter=summary --max-diagnostics=none  ← 件数を数える
5. 件数で作戦を決める:
     〜50件   → 全部直す
     〜500件  → ルール別に "warn" へ降格 → 順に "error" へ昇格
     500件〜  → biome lint --suppress --reason="..." . && biome format --write .
                または biome ci --changed --since=origin/main
6. ルールは --only で件数を見てから 1 つずつ足す
7. レガシー領域は overrides で免除（5 個以内に収める）
8. リポジトリが増えたら extends で設定を共有
```

---

## 落とし穴

| 症状 | 原因 |
|---|---|
| `couldn't find an ignore file` でハードエラー | `vcs.useIgnoreFile: true` なのに `.gitignore` が無い |
| `--write` しても消えないルールがある | **fix が無いルール。** `biome explain` の `No fix available.` を確認 |
| `biome-ignore-all` が効かない | **ファイルの先頭に無い。** `suppression/unused` が出る |
| 覚えのないルールが動いている | **domain が `package.json` の依存から自動有効化**されている |
| `--suppress` 後にインデントが崩れた | 仕様。**`format --write` を続けて実行する** |
| 1.x の設定がエラーになる | `files.include`/`ignore` → `files.includes`、`organizeImports` → `assist.*`。`biome migrate --write` |
| 設定キーが分からない | **`$schema` を書いてエディタで補完させる**。これが最速 |
| Markdown / YAML が整形されない | **2.5.15 では未対応** |

---

## 困ったときの 3 コマンド

```console
$ pnpm exec biome explain <ルール名>    # ルールの意味・fix の有無
$ pnpm exec biome check . --verbose     # 処理したファイル一覧
$ pnpm exec biome rage                  # 環境診断（バグ報告用）
```
