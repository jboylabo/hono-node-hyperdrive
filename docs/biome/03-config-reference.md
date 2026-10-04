# 03. `biome.json` 設定リファレンス

Biome 2.5.15 の設定キー辞書です。**通読する必要はありません。** 必要なときに引いてください。

> **最強のリファレンスはエディタです。** `biome.json` の先頭に
> `"$schema": "https://biomejs.dev/schemas/2.5.15/schema.json"` があれば、
> VS Code などが**全キーを補完し、値を検証し、説明をホバー表示**してくれます。
> このファイルは「何が存在するかを俯瞰する」ためのものです。

---

## トップレベルの 16 キー

```jsonc
{
  "$schema":   "...",  // スキーマ URL（補完・検証用）
  "root":      true,   // このファイルが Biome プロジェクトのルートか
  "extends":   [],     // 他の設定ファイルを継承する
  "files":     {},     // どのファイルを扱うか
  "vcs":       {},     // Git 連携
  "formatter": {},     // 整形（全言語共通）
  "linter":    {},     // lint
  "assist":    {},     // 並べ替え系アクション
  "javascript":{},     // JS/TS/JSX 固有
  "json":      {},     // JSON/JSONC 固有
  "css":       {},     // CSS 固有
  "graphql":   {},     // GraphQL 固有
  "html":      {},     // HTML 固有（実験的）
  "grit":      {},     // GritQL 固有
  "plugins":   [],     // GritQL プラグイン
  "overrides": []      // パターンごとの上書き
}
```

**設定の優先順位**は次のとおりです。下にあるものが勝ちます。

```
内蔵デフォルト
  ↓
extends で継承した設定
  ↓
.editorconfig（formatter.useEditorconfig: true のときのみ）
  ↓
biome.json のトップレベル（formatter, linter, ...）
  ↓
biome.json の言語別（javascript.formatter, json.formatter, ...）
  ↓
overrides（後ろの要素が勝つ）
  ↓
CLI フラグ（--indent-style など）
```

---

## `$schema`

```json
"$schema": "https://biomejs.dev/schemas/2.5.15/schema.json"
```

**必ず書いてください。** エディタ補完・検証が効くようになり、設定を覚える負担が激減します。
`biome exec biome init` がインストール済みバージョンに合わせて自動で書いてくれるので、
**Biome をアップグレードしたらこの URL のバージョンも上げる**ことを忘れないように。

---

## `root`

```json
"root": true
```

既定 `true`。モノレポで**サブパッケージ側の `biome.json`** を置くときに `false` にします。
`false` だと「このファイルはネストされた設定である」と Biome が認識し、上位の設定を探します。

このプロジェクトは単一パッケージなので省略（= `true`）で問題ありません。

---

## `extends`

```json
"extends": ["./configs/biome.base.json"]
```

他の設定ファイルを継承します。**実務で最も価値のある機能の 1 つ**です。

- **社内共通設定を npm パッケージにできる**: `"extends": ["@mycompany/biome-config"]`
- **モノレポのルート設定を継承**: `"extends": ["//"]`（`//` はプロジェクトルートの意味）
- 配列の後ろにあるものが勝ちます

チーム 3 人以上、リポジトリ 2 個以上になったら `extends` でルールを共有してください。
各リポジトリに設定をコピペすると、必ず乖離します。

---

## `files` — どのファイルを扱うか

```json
"files": {
  "includes": ["**", "!**/dist", "!**/.wrangler", "!**/drizzle/**/*.sql"],
  "ignoreUnknown": true,
  "maxSize": 1048576
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `includes` | 全ファイル | 扱うファイルのグロブ。**`!` を前置すると除外** |
| `ignoreUnknown` | `false` | 未対応の拡張子について診断を出さない。**`true` 推奨** |
| `maxSize` | `1048576`（1 MiB） | これより大きいファイルは無視。生成された巨大ファイル対策 |
| `experimentalScannerIgnores` | — | **非推奨。** `includes` の `!!` を使う |

### グロブ構文

| 書き方 | 意味 |
|---|---|
| `*` | 1 階層のみのワイルドカード |
| `**` | 再帰的なワイルドカード |
| `[a-z]` / `[!abc]` | 文字範囲 / 除外範囲 |
| `!pattern` | **除外**（negation） |
| `!!pattern` | **強制除外**（force-ignore）。スキャナのインデックス対象からも外す |

`!` と `!!` の違い: 通常の `!` でも検査対象からは外れますが、Biome の
マルチファイル解析スキャナは中身を読んでいます。`!!` はスキャナからも完全に外すので、
**巨大な生成ディレクトリで速度を稼ぎたいとき**に使います。

### `includes` と `vcs.useIgnoreFile` の使い分け

- **`.gitignore` に載っているもの**（`dist/`、`node_modules/`）→ `vcs.useIgnoreFile: true` に任せる
- **`.gitignore` には載らないがツールで見たくないもの**（生成 SQL、スナップショット）→ `files.includes` に `!` で書く

二重に書いても害はありません。

---

## `vcs` — Git 連携

```json
"vcs": {
  "enabled": true,
  "clientKind": "git",
  "useIgnoreFile": true,
  "defaultBranch": "main"
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `enabled` | `false` | **これを `true` にしないと以下が全部効きません** |
| `clientKind` | — | 現在は `"git"` のみ |
| `useIgnoreFile` | `false` | `.gitignore` / `.ignore` / `.git/info/exclude` を除外リストとして使う |
| `root` | `biome.json` のディレクトリ | ignore ファイルを探す基準ディレクトリ |
| `defaultBranch` | — | `--changed` が比較する既定ブランチ |

### ハマりどころ ⚠️

`useIgnoreFile: true` なのに `vcs.root` に `.gitignore` が**無いとハードエラー**で止まります。

```
× Biome couldn't find an ignore file in the following folder: ...
```

`defaultBranch` を書いておくと、`--since` を省略して `biome check --changed` が使えます。
CI で「変更された分だけ検査」をやるときに効きます。

---

## `formatter` — 整形（全言語共通）

```json
"formatter": {
  "enabled": true,
  "indentStyle": "space",
  "indentWidth": 2,
  "lineWidth": 100,
  "lineEnding": "lf"
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `enabled` | `true` | |
| `includes` | 全部 | `files.includes` の**後に**適用される絞り込み |
| `indentStyle` | **`tab`** | `tab` / `space` |
| `indentWidth` | `2` | |
| `lineWidth` | **`80`** | 最大行幅。JSX を書くなら 100〜120 が扱いやすい |
| `lineEnding` | `lf` | `lf` / `crlf` / `cr` / `auto`。**`lf` 固定推奨** |
| `formatWithErrors` | `false` | 構文エラーのあるファイルも整形を試みる |
| `attributePosition` | `auto` | `auto` / `multiline`。HTML/JSX の属性配置 |
| `bracketSpacing` | `true` | `{ a: 1 }` か `{a: 1}` か |
| `bracketSameLine` | `false` | 複数行 JSX の `>` を最終行の末尾に置くか |
| `delimiterSpacing` | `false` | 区切り記号の内側にスペースを入れるか |
| `expand` | `auto` | **後述** |
| `trailingNewline` | `true` | ファイル末尾に改行を入れる。**切ると他ツールと揉めるので触らない** |
| `useEditorconfig` | `false` | `.editorconfig` を読む（`biome.json` が優先） |

### `expand` — 配列・オブジェクトを 1 行にするか

地味ですが差分の見え方を大きく変えます。

| 値 | 挙動 |
|---|---|
| `auto`（既定） | **最初のプロパティの前に改行があれば**複数行に展開。配列は収まれば 1 行 |
| `always` | 常に複数行に展開 |
| `never` | 収まる限り 1 行に詰める |

`auto` は「書いた人の意図を尊重する」モードです。手で改行を入れておけばその形が保たれます。
**`always` にすると差分が行単位になってレビューしやすくなる**ので、
設定ファイル中心のリポジトリでは検討の価値があります。

> 02 の手順書で `tsconfig.json` の `"lib": ["ESNext"]` が 1 行に詰められたのは
> `expand: "auto"` + 行幅に収まるため、です。

---

## `linter` — lint

```json
"linter": {
  "enabled": true,
  "rules": { "preset": "recommended" },
  "domains": { "project": "recommended" }
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `enabled` | `true` | |
| `includes` | 全部 | lint だけ対象を絞る |
| `rules` | `recommended` | ルール設定。**[05](./05-linter-rules.md) で詳述** |
| `domains` | 自動検出 | フレームワーク単位のルール束。**[05](./05-linter-rules.md) で詳述** |

ルールの中身は量が多いので [05-linter-rules.md](./05-linter-rules.md) に分けています。

---

## `assist` — 並べ替え系アクション

```json
"assist": {
  "enabled": true,
  "actions": {
    "source": {
      "organizeImports": "on"
    }
  }
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `enabled` | `true` | |
| `includes` | 全部 | |
| `actions.recommended` | `true` | 推奨アクションを有効化 |
| `actions.preset` | — | `recommended` / `all` / `none` |
| `actions.source.*` | | 個別アクション。値は `"on"` / `"off"` |

アクション一覧は [01-overview.md](./01-overview.md#assist--必ず-fix-がある整列系アクション) にあります。

### `organizeImports` の細かい制御

既定の並び順は「**自分のファイルからの距離**」順です。

1. URL（`https://...`）
2. プロトコル付きパッケージ（`node:path`、`bun:test`、`npm:lib`）
3. 素のパッケージ（`hono`、`@scope/lib`）
4. エイリアス（`@/`、`#`、`~`、`$`、`%`）
5. 絶対パス・相対パス（`./renderer`）

同じ段の中は自然順（`a < a9 < a10 < B`）。同じ source からの import は統合されます。

既定で十分ですが、グループを自分で定義することもできます。

```jsonc
"assist": {
  "actions": {
    "source": {
      "organizeImports": {
        "level": "on",
        "options": {
          "groups": [
            [":BUN:", ":NODE:"],   // ランタイム組み込みを先頭に
            ":BLANK_LINE:",        // 空行を 1 つ入れる
            ":PACKAGE:",           // 外部パッケージ
            ":BLANK_LINE:",
            [":ALIAS:", ":PATH:"]  // 自分のコード
          ],
          "sortBareImports": false,   // 副作用 import を並べ替えない（既定）
          "identifierOrder": "natural" // natural / lexicographic
        }
      }
    }
  }
}
```

**使えるグループセレクタ**:

| セレクタ | マッチするもの |
|---|---|
| `:URL:` | `https://` / `http://` |
| `:NODE:` | `node:path`、`fs`、`path` |
| `:BUN:` | `bun:test`、`bun` |
| `:PACKAGE_WITH_PROTOCOL:` | `npm:lib`、`jsr:@my/lib` |
| `:PACKAGE:` | `hono`、`@scope/lib` |
| `:ALIAS:` | `@/`、`#`、`~`、`$`、`%` |
| `:PATH:` | `./x`、`../x`、`/x` |
| `:STYLE:` | `.css` / `.scss` / `.less` など |
| `:BLANK_LINE:` | （区切りとして空行を入れる） |

グロブも書けます（`"@mycompany/**"`）。`!` で除外、`{ "type": true }` で `import type` のみ、
`{ "kind": "bare" }` で副作用 import のみ、を指定できます。

> **`sortBareImports` に注意。** `import './polyfill'` のような副作用 import を
> 並べ替えると**実行順が変わって壊れます**。既定の `false` のままにしておくのが安全です。

---

## `javascript` — JS / TS / JSX 固有

```json
"javascript": {
  "jsxRuntime": "transparent",
  "formatter": {
    "quoteStyle": "single",
    "jsxQuoteStyle": "double",
    "semicolons": "asNeeded",
    "trailingCommas": "all",
    "arrowParentheses": "always"
  },
  "globals": ["WebSocketPair"]
}
```

### `javascript.formatter`

| キー | 既定 | 説明 |
|---|---|---|
| `quoteStyle` | **`double`** | JS/TS のクォート |
| `jsxQuoteStyle` | `double` | **JSX 属性のクォート（別キー）** |
| `quoteProperties` | `asNeeded` | オブジェクトキーをいつクォートするか。`preserve` で元のまま |
| `trailingCommas` | `all` | `all` / `es5` / `none` |
| `semicolons` | **`always`** | `always` / `asNeeded` |
| `arrowParentheses` | `always` | `(c) => x` か `c => x` か |
| `bracketSameLine` | 継承 | 複数行 JSX の `>` の位置 |
| `operatorLinebreak` | `after` | 二項演算子で改行するとき、演算子の前か後か |
| `expand` / `indentStyle` / `indentWidth` / `lineWidth` / `lineEnding` / `bracketSpacing` / `delimiterSpacing` / `trailingNewline` | 継承 | 未指定ならトップレベルの `formatter` を継承 |

**`quoteStyle` と `jsxQuoteStyle` が別キー**なのが重要です。
「JS はシングル、JSX 属性は HTML っぽくダブル」という一般的な好みを表現できます。

### `javascript` のその他

| キー | 既定 | 説明 |
|---|---|---|
| `jsxRuntime` | `transparent` | `transparent`（モダン JSX）/ `reactClassic`（`React` の import が必要） |
| `globals` | `[]` | 「未定義」と怒られたくないグローバル名のリスト |
| `parser.jsxEverywhere` | `true` | `.js` / `.mjs` / `.cjs` でも JSX を許可 |
| `parser.unsafeParameterDecoratorsEnabled` | `false` | パラメータデコレータ（NestJS などで必要） |
| `linter.enabled` / `assist.enabled` / `formatter.enabled` | `true` | JS だけ機能を切る |
| `resolver.experimentalPnpmCatalogs` | `false` | pnpm catalog の解決（このプロジェクトは pnpm だが catalog 未使用） |

> **このプロジェクトでは `jsxRuntime: "transparent"` が正解です。**
> `jsxImportSource: "hono/jsx"` なので React ではありません。
> `reactClassic` にすると「`React` が import されていない」と誤検知します。

> **Cloudflare Workers のグローバル**を使って怒られたら `globals` に追加します。
> 例: `"globals": ["WebSocketPair", "caches", "HTMLRewriter"]`

---

## `json` — JSON / JSONC 固有

```json
"json": {
  "parser": {
    "allowComments": false,
    "allowTrailingCommas": false
  },
  "formatter": {
    "trailingCommas": "none"
  }
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `parser.allowComments` | `false` | `.json` でコメントを許可 |
| `parser.allowTrailingCommas` | `false` | `.json` で末尾カンマを許可 |
| `formatter.trailingCommas` | `none` | `none` / `all` |
| `formatter.expand` / `indentStyle` / ... | 継承 | |

> **`tsconfig.json` や `wrangler.jsonc` は何も設定しなくて大丈夫です。**
> Biome は `tsconfig.json`・`jsconfig.json`・`.eslintrc.json` などを
> **既知の JSONC ファイル**として自動認識し、コメントと末尾カンマを許します。
> `allowComments` を `true` にするのは、**自作の `.json` にコメントを書いている**ときだけです。

---

## `css` — CSS 固有

```json
"css": {
  "parser": {
    "cssModules": false,
    "tailwindDirectives": false
  },
  "formatter": {
    "quoteStyle": "double"
  }
}
```

| キー | 既定 | 説明 |
|---|---|---|
| `parser.cssModules` | `false` | CSS Modules の構文。**ファイル名が `.module.css` なら不要** |
| `parser.tailwindDirectives` | `false` | Tailwind CSS 4.0 の `@theme` などを解析。**Tailwind を入れたら `true`** |
| `parser.allowWrongLineComments` | `false` | 不正な位置のコメントを許す |
| `formatter.quoteStyle` | `double` | |
| `formatter.delimiterSpacing` | `false` | `rgb(0, 0, 0)` → `rgb( 0, 0, 0 )` |

このプロジェクトの `src/style.css` は、**何も設定しなくても整形・lint の対象になります**。

---

## `html` / `graphql` / `grit`

- **`html`** … `experimentalFullSupportEnabled: true` で HTML / Vue / Svelte / Astro の完全サポートを有効化（実験的）。
  `formatter.whitespaceSensitivity`（`css` / `strict` / `ignore`）、`formatter.indentScriptAndStyle`、
  `formatter.selfCloseVoidElements`、`parser.vue`、`parser.interpolation` などがあります。
  **このプロジェクトは JSX で HTML を書くので不要です。**
- **`graphql`** … `formatter` / `linter` / `assist` の 3 つ。`.graphql` ファイルがあれば効きます。
- **`grit`** … GritQL プラグイン（`.grit` ファイル）向け。

---

## `plugins` — 独自ルールを書く

```json
"plugins": ["./biome-plugins/no-internal-import.grit"]
```

Biome 2.x では **GritQL** というパターンマッチ言語で独自 lint ルールを書けます。
ESLint のカスタムルールのような JS を書く必要はなく、宣言的なパターンで済みます。

```grit
// 例: console.log を禁止する
`console.log($args)` where {
  register_diagnostic(span=$args, message="console.log は使わない")
}
```

「社内固有の禁止パターン」を強制したいときに使います。
`biome search 'パターン'` で**プラグインを書く前にパターンを試せる**のが便利です。

---

## `overrides` — パターンごとの上書き

**実務で最も威力がある機能です。** 「このディレクトリだけルールを緩める」ができます。

```jsonc
"overrides": [
  {
    // テストファイルではマジックナンバーと any を許す
    "includes": ["**/*.test.ts", "**/*.spec.ts", "tests/**"],
    "linter": {
      "rules": {
        "style": { "noMagicNumbers": "off" },
        "suspicious": { "noExplicitAny": "off" }
      }
    }
  },
  {
    // 自動生成コードは一切触らない・検査しない
    "includes": ["src/generated/**", "**/*.gen.ts", "worker-configuration.d.ts"],
    "formatter": { "enabled": false },
    "linter": { "enabled": false },
    "assist": { "enabled": false }
  },
  {
    // レガシーコードは警告だけ出して CI を止めない
    "includes": ["src/legacy/**"],
    "linter": {
      "rules": {
        "complexity": { "preset": "none" },
        "style": { "preset": "none" }
      }
    }
  },
  {
    // 設定ファイルは default export を許す
    "includes": ["*.config.ts", "vite.config.ts"],
    "linter": {
      "rules": {
        "style": { "noDefaultExport": "off" }
      }
    }
  }
]
```

`overrides` 内で指定できるのは
`includes` / `formatter` / `linter` / `assist` / `javascript` / `json` / `css` / `graphql` / `html` / `grit` / `files` / `plugins` です。

### 使い方のコツ

- **配列の後ろが勝つ。** 広いパターンを先、狭い例外を後に書く
- `linter.enabled: false` は「このファイルは諦める」という明示。コメントで理由を書く
- **`overrides` が 5 個を超えたら設計を疑う。** ルールが厳しすぎるか、コードの分割が悪い

---

## このプロジェクトでの推奨まとめ

| セクション | 推奨 | 理由 |
|---|---|---|
| `$schema` | **必ず書く** | エディタ補完が効く |
| `root` | 省略 | 単一パッケージ |
| `extends` | 今は不要 | リポジトリが増えたら検討 |
| `files.includes` | `!**/dist` `!**/.wrangler` を除外 | ビルド成果物 |
| `files.ignoreUnknown` | `true` | Markdown 等の警告を止める |
| `vcs` | `enabled` + `useIgnoreFile` を `true` | `.gitignore` に寄せる |
| `formatter` | `space` / `2` / `100` / `lf` | 既存コードに合わせる |
| `linter.rules` | `preset: "recommended"` | まずはこれだけ |
| `linter.domains` | `project: "recommended"` | 2.x の目玉。`react` は**使わない** |
| `assist` | `organizeImports: "on"` | init が既定で入れてくれる |
| `javascript` | `single` / `asNeeded` / `jsxQuoteStyle: double` | 既存コードに合わせる |
| `javascript.jsxRuntime` | `transparent` | **React ではない** |
| `json.formatter.trailingCommas` | `none` | JSON の仕様どおり |
| `css` | 省略 | 既定で動く |
| `html` / `graphql` / `grit` / `plugins` | 不要 | 該当ファイルなし |
| `overrides` | 今は不要 | `tests/` が埋まったら追加 |
