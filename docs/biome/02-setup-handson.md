# 02. 手順書 — 自分で Biome を設定する

このプロジェクトの Biome を **ゼロから設定し終える**までを、手を動かしながら進めます。

- 所要時間: 約 60 分
- 前提: [01-overview.md](./01-overview.md) を読んでいること
- **このドキュメントに書かれたファイルは、まだ 1 つも作られていません。** 全部あなたが作ります。
- 各ステップに「**実行**」「**期待される結果**」「**何を学んだか**」があります。期待される結果と違ったら、そこで止まって原因を調べてください。

> ここに書かれている数値（エラー件数など）はすべて**このプロジェクトで実測した値**です。
> 同じ数字が出れば、正しく進んでいます。

---

## 到達点（ゴール）

| 段階 | `biome check .` のエラー数 |
|---|---|
| Step 0: 設定なし（今ここ） | **8 errors** |
| Step 3: スタイルを既存コードに合わせた後 | **5 errors** |
| Step 6: `check --write` で自動修正した後 | **1 error** |
| Step 7: 最後の 1 件を手で直した後 | **0 errors** ✨ |

最後の 1 件が自動で消えないのには理由があります。それも Step 7 で学びます。

---

## Step 0 — 現状を測る

**設定ファイルを作る前に、まず現状を測ります。** これをやらないと「設定して何が変わったのか」が分かりません。

### 実行

```console
$ pnpm exec biome --version
$ pnpm exec biome check . --reporter=summary
```

### 期待される結果

```
Version: 2.5.15
```

```
reporter/format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The following files need to be formatted:

  - package.json
  - src/index.tsx
  - src/renderer.tsx
  - src/style.css
  - tsconfig.json
  - vite.config.ts
  - wrangler.jsonc

reporter/violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Rule Name                           Diagnostics

  lint/a11y/useHtmlLang               1 (1 error)

Checked 7 files in 7ms. No fixes applied.
Found 8 errors.
```

**7 ファイル未フォーマット + lint エラー 1 件 = 8 errors。**

### 何を学んだか

- **`biome.json` が無くても Biome は動く。** 内蔵デフォルト（タブ / ダブルクォート / セミコロンあり / 行幅 80 / `recommended` ルール）が使われます。
- `--reporter=summary` は「全体像だけ見たい」ときに便利。1 件ずつの差分は出ず、ファイル名とルール名の集計だけが出ます。
- この時点で `biome format --write .` を実行してはいけません。**既存コードが全部タブ + ダブルクォートに書き換わります。**

> **なぜ 7 ファイルすべてが未フォーマットなのか？**
> 既存コードは「スペース 2 / シングルクォート / セミコロンなし」、Biome のデフォルトは
> 「タブ / ダブルクォート / セミコロンあり」。**全部食い違っている**からです。
> Step 3 でここを揃えます。

---

## Step 1 — `biome.json` を生成して読む

### 実行

```console
$ pnpm exec biome init
```

> コメントを書き込める JSONC 形式がよければ `pnpm exec biome init --jsonc` で
> `biome.jsonc` が生成されます。設定の意図をコメントで残せるので、**実務ではこちらを勧めます。**
> このドキュメントでは `biome.json` で進めます。

### 期待される結果

ロゴが表示され、`biome.json` が作られます。**中身を必ず開いて読んでください。**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": {
    "enabled": false,
    "clientKind": "git",
    "useIgnoreFile": false
  },
  "files": {
    "ignoreUnknown": false
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

### 何を学んだか

生成された 7 行だけで、Biome の設計がほぼ分かります。

- **`$schema` が最初から `2.5.15` で入っている。** `biome init` はインストール済みのバージョンに合わせて書いてくれるので、**手で直す必要はありません。** これのおかげでエディタが補完とバリデーションをしてくれます。設定を覚える一番の近道は、`biome.json` を開いて <kbd>Ctrl</kbd>+<kbd>Space</kbd> を押すことです。
- **`formatter` / `linter` / `assist` の 3 つが並んでいる。** これが [01](./01-overview.md) で見た役割分担そのままです。
- **`linter.rules.preset: "recommended"`。** 2.x で追加された書き方です（1.x は `"recommended": true`）。古い記事では後者になっています。
- **`assist.actions.source.organizeImports` が最初から `"on"`。** import 整理はデフォルトで有効なので、**自分で追加する必要はありません。**
- **`vcs.enabled` と `files.ignoreUnknown` は `false`。** ここは Step 4 で変えます。
- `indentStyle: "tab"` と `quoteStyle: "double"` が**明示的に書かれている**。デフォルト値をあえて書き出しているので、ここを書き換えれば済みます。

### 確認

```console
$ pnpm exec biome check . --reporter=summary
```

**まだ 8 errors のままです。** 生成された設定は内蔵デフォルトと同じ内容なので、何も変わりません。

---

## Step 2 — 整形スタイルを決める（考える時間）

ここが**このプロジェクトで一番重要な判断**です。コマンドは実行しません。

既存コードはこうなっています（`src/index.tsx`）。

```tsx
import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()
```

- スペース 2 インデント
- シングルクォート
- セミコロンなし

Biome のデフォルトはタブ / ダブルクォート / セミコロンあり。**選択肢は 2 つです。**

| | A: 既存コードに合わせる | B: Biome デフォルトに合わせる |
|---|---|---|
| 設定の量 | 少し増える | 最小 |
| 初回 `--write` の差分 | **小さい** | **全ファイル書き換わる** |
| `git blame` への影響 | ほぼ無し | 全行が整形コミットになる |
| Prettier 慣れしたチーム | 馴染む | 違和感がある |
| 「Biome 標準」の学習 | しにくい | しやすい |

**このプロジェクトでは A を選びます。** 理由は、既存コードがわずか 3 ファイルとはいえ、
**「ツールを入れた瞬間に全ファイルが書き換わる」という体験は実務では事故**だからです。
既存プロジェクトに Biome を入れるときは、まず現状のスタイルに合わせ、
変えたいなら**後から別コミットで**変えるのが安全です。

> **B を選んだ場合どうなるか**: `src/index.tsx` の 12 行すべてが
> タブ + ダブルクォート + セミコロンに書き換わります。
> 新規プロジェクトなら B で問題ありません。むしろ設定が短くて済むので推奨できます。

---

## Step 3 — 整形スタイルを既存コードに合わせる

### 実行

`biome.json` の `formatter` と `javascript.formatter` を書き換えます。

```json
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
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
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  }
```

各キーの意味:

| キー | 値 | 効果 |
|---|---|---|
| `formatter.indentStyle` | `space` | タブではなくスペース |
| `formatter.indentWidth` | `2` | スペース 2 個 |
| `formatter.lineWidth` | `100` | デフォルトの 80 は JSX には窮屈。Prettier 慣れなら 100 が扱いやすい |
| `formatter.lineEnding` | `lf` | Windows 混在チームでも差分が出ない |
| `javascript.formatter.quoteStyle` | `single` | JS/TS はシングルクォート |
| `javascript.formatter.jsxQuoteStyle` | `double` | **JSX の属性だけはダブル**（HTML の慣習。`<html lang="ja">`） |
| `javascript.formatter.semicolons` | `asNeeded` | ASI 事故を防ぐために必要な箇所だけ付ける |
| `javascript.formatter.trailingCommas` | `all` | 複数行構造の末尾にカンマ。Prettier 3 と同じ既定 |
| `javascript.formatter.arrowParentheses` | `always` | `(c) => ...`。既存コードがこの形 |
| `javascript.jsxRuntime` | `transparent` | **React ではない**ので `reactClassic` にはしない |
| `json.formatter.trailingCommas` | `none` | JSON は末尾カンマ不可（JSONC は別扱い） |

### 期待される結果

```console
$ pnpm exec biome check . --reporter=summary
```

```
  i The following files need to be formatted:

  - package.json
  - tsconfig.json
  - vite.config.ts
  - wrangler.jsonc

  Rule Name                           Diagnostics

  lint/a11y/useHtmlLang               1 (1 error)

Found 5 errors.
```

**8 errors → 5 errors。** そして重要なのは、**消えた 3 件が `src/index.tsx` / `src/renderer.tsx` / `src/style.css`** であることです。
つまり**自分で書いたコードは整形不要になった**。設定が既存スタイルに一致した証拠です。

### 残った 4 件は何か

残っているのは全部**テンプレートが生成した設定ファイル**です。中身を見てみましょう。

```console
$ pnpm exec biome format tsconfig.json
```

| ファイル | 差分の内容 |
|---|---|
| `package.json` | **末尾に改行が無い**（`formatter.trailingNewline` の既定が `true`） |
| `wrangler.jsonc` | **末尾に改行が無い** |
| `tsconfig.json` | 末尾改行なし + `"lib": ["ESNext"]` が 1 行に収まる + **`}` の後の余分な末尾カンマを削除** |
| `vite.config.ts` | `plugins: [...]` に**末尾カンマを追加**（`trailingCommas: "all"` の効果） |

どれも些細な差分で、**自動修正できます**。Step 6 で一気に直します。

> **`tsconfig.json` の末尾カンマについて**:
> このファイルは `"compilerOptions": { ... },` の後に余分なカンマがあり、厳密な JSON としては不正です。
> しかし **Biome は `tsconfig.json` を既知の JSONC ファイルとして扱う**ので、
> パースエラーにはならず、整形時に静かに取り除かれます。何も設定しなくて大丈夫です。

### 何を学んだか

- **設定を変えたら必ず `check` して差分の減り方を見る。** これが設定を理解する最速の方法です。
- `lineWidth` のように「正解が無い」設定は、チームで一度決めて二度と議論しないのが正解。
- JS はシングル、JSX 属性はダブル、という分け方ができる（`quoteStyle` と `jsxQuoteStyle` が別キー）。

---

## Step 4 — 検査対象を絞る

今のままでは、ビルド成果物や生成物まで検査してしまう可能性があります。除外設定を入れます。

### 実行

`biome.json` の `vcs` と `files` を書き換えます。

```json
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["**", "!**/dist", "!**/.wrangler", "!**/drizzle/**/*.sql"],
    "ignoreUnknown": true
  },
```

| キー | 効果 |
|---|---|
| `vcs.enabled: true` | Git 連携を有効化。これが `false` だと以下 2 つが効きません |
| `vcs.useIgnoreFile: true` | **`.gitignore` をそのまま除外リストとして使う。** `.prettierignore` と `.eslintignore` を二重管理しなくて済む |
| `files.includes` | 検査対象のグロブ。`"**"` で全部、`!` を前置して除外 |
| `files.ignoreUnknown: true` | 対応していない拡張子（`.md` など）について「知らないファイル」と文句を言わせない |

`files.includes` の除外が `.gitignore` と重複していても害はありません。
**`.gitignore` に載らない生成物**（例: `drizzle/` のマイグレーション SQL）を明示するのが目的です。

### 期待される結果

```console
$ pnpm exec biome check . --reporter=summary
```

**5 errors のまま変わりません。** それが正しい。`dist/` も `.wrangler/` も現状存在しないので、除外しても結果は同じです。
**この設定は「将来の事故を防ぐため」のもの**です。

### ハマりどころ ⚠️

`vcs.useIgnoreFile: true` にしたのに `.gitignore` が存在しないと、Biome は**ハードエラーで止まります**。

```
× Biome couldn't find an ignore file in the following folder: /path/to/project
× Biome exited because the configuration resulted in errors. Please fix them.
```

このプロジェクトには `.gitignore` があるので問題ありませんが、
新規プロジェクトやサブディレクトリで `biome.json` を使うときは注意してください。
Biome は **`biome.json` があるディレクトリ**を基準に `.gitignore` を探します。
場所が違うなら `vcs.root` で指定します。

### 何を学んだか

- 除外設定は **`.gitignore` に寄せる**のが 2.x の作法。ignore ファイルを増やさない。
- `files.includes` は 1.x の `include` + `ignore` が統合されたもの。**`!` で除外**という書き方を覚える。
- 「結果が変わらない設定」にも意味がある。

---

## Step 5 — `package.json` にスクリプトを追加する

毎回 `pnpm exec biome ...` と打つのは現実的ではありません。スクリプトにします。

### 実行

`package.json` の `scripts` に追加します（既存の `dev` / `build` などは消さないこと）。

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "$npm_execpath run build && vite preview",
    "deploy": "$npm_execpath run build && wrangler deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",

    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "format": "biome format .",
    "format:write": "biome format --write .",
    "check": "biome check .",
    "check:write": "biome check --write .",
    "ci": "biome ci ."
  },
```

> スクリプト内では `pnpm exec` は不要です。`node_modules/.bin` が自動で PATH に入ります。
> なお上の空行は読みやすさのために書いていますが、JSON に空行は書けるので問題ありません。

### 期待される結果

```console
$ pnpm check
```

Step 4 と同じ **5 errors** が出ます。

### なぜ 7 つもスクリプトがあるのか

| スクリプト | 用途 | 書き込み |
|---|---|---|
| `check` | **日常の確認。これを一番使う。** format + lint + assist を一括検査 | しない |
| `check:write` | **日常の修正。これを二番目に使う。** 一括で直す | **する** |
| `lint` / `lint:fix` | lint だけに絞りたいとき（整形差分がノイズになる場合） | `:fix` のみする |
| `format` / `format:write` | 整形だけに絞りたいとき | `:write` のみする |
| `ci` | **CI 用。** 書き込みを一切しない | **絶対にしない** |

**`check` と `ci` を分ける理由**がここで重要です。

- `check` は `--write` を**付けられる**。うっかり CI で `--write` してしまう事故がありえます。
- `ci` は **`--write` / `--fix` / `--unsafe` フラグ自体が存在しない**。構造的に書き込めません。
- さらに `ci` には `--threads` があり、CI マシンの並列度を制御できます。

「CI では絶対にファイルを書き換えない」をツール側で保証するためのコマンドが `ci` です。

### 何を学んだか

- `check` = format + lint + assist。**迷ったら `check` を使う。**
- 検査（`check`）と適用（`check:write`）を**別スクリプトに分ける**と、事故が減る。
- CI 用コマンドは別に用意されている。`check` を CI で使うより `ci` を使う。

---

## Step 6 — 一括適用して差分を自分の目で読む

### 実行

**先にコミットしておくこと。** 差分を読むために必要です。

```console
$ git add -A && git commit -m "chore: biome の設定を追加"
$ pnpm check:write
$ git diff
```

### 期待される結果

```
Checked 7 files in 32ms. Fixed 4 files.
Found 1 error.
```

**4 ファイルが修正され、1 件だけ残りました。** `git diff` で中身を確認してください。

- `package.json` / `wrangler.jsonc` … 末尾に改行が 1 つ追加されただけ
- `tsconfig.json` … 末尾改行 + `"lib": ["ESNext"]` の 1 行化 + 余分な末尾カンマの削除
- `vite.config.ts` … `plugins: [cloudflare(), ssrPlugin()],` に末尾カンマ
- **`src/` の 3 ファイルは一切変わっていない** ← Step 3 の成果

### `--write` と `--write --unsafe` の違い

```console
$ pnpm exec biome check --write --unsafe .
```

`--unsafe` を付けると、**意味が変わる可能性のある修正**まで適用されます。
今回は追加で直るものがないので結果は同じですが、覚えておくべき区別です。

| | 適用されるもの | 例 |
|---|---|---|
| `--write` | **safe fix** のみ。意味が変わらないと保証されている | `let` → `const`、整形、import 並べ替え |
| `--write --unsafe` | safe + **unsafe fix** | 型注釈の削除、`==` → `===`（意味が変わりうる） |

**`--unsafe` は手で実行して `git diff` を読むときだけ使ってください。**
CI やコミットフックで自動適用するのは危険です。

### ⚠️ 実務での重要な作法

**整形の一括適用は、必ず「整形だけのコミット」にすること。**

```console
$ git add -A && git commit -m "style: biome で全ファイルを整形"
```

機能変更と整形を同じコミットに混ぜると、`git blame` が整形コミットで埋まり、
「この行を誰がなぜ書いたか」が追えなくなります。
さらに `.git-blame-ignore-revs` にそのコミットハッシュを書いておくと、
`git blame` が自動的にそのコミットを飛ばしてくれます。

### 何を学んだか

- **`--write` した後は必ず `git diff` を読む。** ツールに任せきりにしない。
- safe と unsafe の境界は Biome が決めている。`--unsafe` は人間の目とセットで。
- 整形コミットは分離する。これは Biome 固有の話ではなく、全フォーマッタに共通の作法です。

---

## Step 7 — 最後の 1 件を 3 通りで解決する

残ったのはこれです。

```console
$ pnpm check
```

```
src/renderer.tsx:6:5 lint/a11y/useHtmlLang ━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Provide a lang attribute when using the html element.

    6 │     <html>
      │     ^^^^^^

  i Setting a lang attribute on HTML document elements configures the
    language used by screen readers when no user default is specified.
```

### まずルールを調べる

```console
$ pnpm exec biome explain useHtmlLang
```

```
- Name: useHtmlLang
- No fix available.
- Default severity: error
- Available from version: 1.0.0
- Diagnostic category: lint/a11y/useHtmlLang
- This rule is recommended
```

**`No fix available.`** ← ここが今回の学びです。
`--write` でも `--unsafe` でも消えないのは、**Biome が自動修正を持っていないルール**だから。
`lang` に何を入れるべきか（`ja`？ `en`？）はツールには分かりません。だから人間が決めます。

> `biome explain` は**ルールに迷ったとき最初に打つコマンド**です。
> ブラウザでドキュメントを探す前にこれを打つ習慣をつけてください。

### 解決策 A: 直す（← これが正解）

`src/renderer.tsx` を編集します。

```tsx
-      <html>
+      <html lang="ja">
```

```console
$ pnpm check
```

```
Checked 7 files in 2ms. No fixes applied.
```

**エラーが 0 になりました。** 🎉

これが正解である理由: スクリーンリーダーが読み上げ言語を判断できず、
**実際にアクセシビリティが壊れている**からです。ルールは正しく本物の問題を指摘していました。

> `jsxQuoteStyle: "double"` にしたので `lang="ja"` がダブルクォートのまま保たれます。
> `"single"` にしていたら `lang='ja'` に書き換えられていました。Step 3 の判断が効いています。

### 解決策 B: ルールを切る（プロジェクト全体）

```json
  "linter": {
    "rules": {
      "preset": "recommended",
      "a11y": {
        "useHtmlLang": "off"
      }
    }
  }
```

- **影響範囲**: プロジェクト全体。今後書くすべての `<html>` で検出されなくなる
- **使うべき場面**: そのルールがプロジェクトの方針と根本的に合わないとき
- **使ってはいけない場面**: 今回のように**1 箇所直せば済むとき**

### 解決策 C: その 1 行だけ抑制する

```tsx
export const renderer = jsxRenderer(({ children }) => {
  return (
    {/* biome-ignore lint/a11y/useHtmlLang: 言語は後続PRで i18n 対応時に決める */}
    <html>
```

- **影響範囲**: その次の 1 行だけ
- **理由テキストは必須。** `biome-ignore lint/a11y/useHtmlLang:` の後ろを空にすると Biome が怒ります。
  これは意図的な設計で、「なぜ無視したか」を強制的に残させます
- JSX の中では `{/* ... */}` で囲む（`//` は使えない）
- **使うべき場面**: 本当に例外的な 1 箇所。期限や理由を書いて残す

### 3 つの選び方

| | 影響範囲 | 使うとき |
|---|---|---|
| **A: 直す** | なし | **原則これ。** ルールが正しいなら従う |
| **B: ルールを切る** | プロジェクト全体 | ルール自体が方針に合わないとき |
| **C: 1 行抑制** | 1 行 | 例外が 1 箇所だけで、理由を説明できるとき |

**迷ったら A。** B と C は「ルールに従えない理由」を説明できるときだけ。
`biome-ignore` が増えてきたら、それは B にすべきというサインです。

### 何を学んだか

- **fix がないルールがある。** `biome explain` で事前に分かる。
- 抑制には**理由を書く義務がある**。これは ESLint より厳しく、良い設計です。
- 「エラーを黙らせる」前に「エラーが正しいかどうか」を考える。今回は**ルールが正しかった**。

---

## Step 8 — 完成形の `biome.json`

ここまでの全部をまとめた最終形です。**動作確認済み**です。

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
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
    "rules": {
      "preset": "recommended"
    },
    "domains": {
      "project": "recommended"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
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
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  }
}
```

`linter.domains.project` は Step では触れていませんが、
**同じリポジトリ内のファイルを横断して見るルール束**です（存在しない export を import していないか等）。
Biome 2.x の目玉機能なので有効にしています。詳細は [05-linter-rules.md](./05-linter-rules.md) を参照。

---

## 最終確認

```console
$ pnpm check          # → Checked 7 files. エラーなし
$ pnpm lint           # → エラーなし
$ pnpm format         # → エラーなし
$ pnpm ci             # → エラーなし
$ git status --short  # → 変更なし（すべてコミット済み）
```

4 つ全部が通れば完了です。

---

## ここから先

- 設定キーの意味を詳しく知りたい → [03-config-reference.md](./03-config-reference.md)
- CLI のフラグを調べたい → [04-cli-reference.md](./04-cli-reference.md)
- **ルールをチームで運用したい / 仕事のプロジェクトに入れたい** → [05-linter-rules.md](./05-linter-rules.md)
- 日常のコマンドだけ見たい → [99-cheatsheet.md](./99-cheatsheet.md)

### 次にやると効果が大きいこと（今回の範囲外）

1. **エディタ連携** — VS Code 拡張 `biomejs.biome` を入れて保存時整形にする。これをやると `check:write` を手で打つ回数が激減します。
2. **CI** — GitHub Actions で `pnpm ci` を回す。`--reporter=github` にすると PR の差分にアノテーションが付きます。
3. **コミット前フック** — lefthook + `biome check --write --staged` で、ステージ済みファイルだけ整形する。

---

## 補足 — 教材と違うエラーが出たとき

ハンズオン本編の手順どおりでも、**エディタや設定の書き方**によって次の 2 つはよく出ます。Biome CLI 自体の不具合ではありません。

### 1. `$schema` を読み込めない（Cursor / VS Code）

```
Unable to load schema from 'https://biomejs.dev/schemas/2.5.15/schema.json':
Downloading schemas is disabled through setting 'json.schemaDownload.enable'.
```

`biome init` が書く URL は正しいですが、エディタ側で**リモート schema の取得がオフ**だと補完用の警告だけ出ます。CLI の `biome check` には影響しません。

**対処:** `biome.json` の `$schema` を、インストール済みパッケージ内の schema に差し替えます。

```json
"$schema": "./node_modules/@biomejs/biome/configuration_schema.json"
```

`@biomejs/biome` のバージョンと schema は常に同梱されるので、オフラインでも補完が効きます。

### 2. `organizeImports: "none"` が設定エラーになる

```
Found an unknown value `none`.
Accepted values: off, on
```

`linter.rules` の `preset` などでは `"none"` が使えますが、**`assist.actions.source.organizeImports` は `"on"` / `"off"` だけ**です。import 整理を止めたいときは `"none"` ではなく `"off"` を書いてください。

```json
"assist": {
  "enabled": true,
  "actions": {
    "source": {
      "organizeImports": "off"
    }
  }
}
```

### 3. pnpm で `"ci"` スクリプトが動かない

Step 5 では `"ci": "biome ci ."` と書いていますが、**pnpm では `pnpm ci` は Biome ではなく lockfile からのクリーン install** が実行されます（`npm ci` も同様）。

**対処:** スクリプト名を `"biome:ci"` など Biome と分かる名前に変え、実行は `pnpm biome:ci` にします。詳細は [PR-MENTOR-NOTES.md](./PR-MENTOR-NOTES.md) を参照。
