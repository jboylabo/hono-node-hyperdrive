# 01. Biome とは何か

## 一言でいうと

**Biome = フォーマッタ + リンタ + import 整理 を 1 つのバイナリにまとめた Rust 製ツール**です。

JavaScript / TypeScript の世界では長年こうでした。

```
Prettier            … コードの整形
ESLint              … バグ・スタイル違反の検出
eslint-plugin-import … import の並べ替え
+ それらをつなぐプラグイン・パーサ・設定ファイル群
```

Biome はこの 3 つを 1 コマンドで置き換えます。設定ファイルは `biome.json` **1 枚だけ**、依存は `@biomejs/biome` **1 個だけ**です。

```console
$ pnpm exec biome check --write .
```

これで「整形 → lint 修正 → import 整列」がまとめて走ります。

---

## なぜ速いのか

Biome は Prettier / ESLint の 10〜30 倍速いとよく言われます。理由は構造にあります。

| | ESLint + Prettier | Biome |
|---|---|---|
| 実装言語 | JavaScript | **Rust**（ネイティブバイナリ） |
| パーサ | Babel / typescript-eslint（別プロセス・別依存） | **自前パーサ**（1 回のパースを lint と format で共有） |
| 中間表現 | AST（コメントや空白を落とす） | **CST**（空白・コメントまで保持 = 整形できる） |
| 並列化 | 限定的 | ファイル単位で**マルチスレッド** |
| 起動コスト | Node の起動 + プラグイン解決 | なし |

CST（Concrete Syntax Tree）を使っているのが重要で、これが「1 つのツールで整形も lint もできる」理由です。
AST はコメントや空白を捨ててしまうので整形には使えません。

> **補足**: 「エラーがあっても止まらない」のも CST のおかげです。壊れた構文のファイルも
> 可能な範囲で解析し、`formatter.formatWithErrors: true` にすれば整形まで試みます。

---

## 3 つの機能の役割分担（ここが v2 の理解の核）

Biome の機能は **formatter / linter / assist** の 3 つに分かれています。
この区別が分かっていないと `biome.json` が読めません。

### formatter — 見た目だけを変える

空白・改行・クォート・セミコロンといった**意味を変えない**書き換えだけを担当します。
Prettier に相当します。

```jsonc
"formatter": { "indentStyle": "space", "lineWidth": 100 }
```

「意味を変えない」ので、**議論の余地がありません**。チームで揉めるところではないので、
決めて自動化して忘れるのが正解です。

### linter — 問題を検出する

バグ・危険なパターン・スタイル違反を検出します。ESLint に相当します。
2.5.15 では **8 グループに 557 ルール**あります。

```jsonc
"linter": { "rules": { "recommended": true } }
```

linter の修正は **safe fix** と **unsafe fix** に分かれます。

- **safe fix** … 意味が変わらないと保証できる。`--write` で自動適用される
- **unsafe fix** … 意味が変わる可能性がある。`--write --unsafe` が必要
- **fix なし** … 人間が直すしかない（例: `a11y/useHtmlLang`）

### assist — 「必ず fix がある」整列系アクション

バグ検出でもなく、空白の整形でもない、**並べ替え・整列**の類です。
`eslint-plugin-import` の `order` ルールや `sort-keys` に相当します。

```jsonc
"assist": { "actions": { "source": { "organizeImports": "on" } } }
```

2.5.15 で使える assist アクションは 10 個です。

| アクション | 何をするか |
|---|---|
| `organizeImports` | import / export を並べ替え・統合する |
| `useSortedKeys` | JSON オブジェクトのキーを並べ替える |
| `useSortedPackageJson` | `package.json` のフィールドを慣習順に並べる |
| `useSortedProperties` | CSS プロパティ・ネストしたルールを並べる |
| `useSortedAttributes` | HTML 要素の属性を並べる |
| `noDuplicateClasses` | CSS の重複クラスを除去する |
| `useSortedEnumMembers` | TS enum のメンバーを並べる |
| `useSortedInterfaceMembers` | TS interface のメンバーをキー順に並べる |
| `useSortedSelectionSet` | GraphQL の selection set を並べる |
| `useSortedTypeFields` | GraphQL type のフィールドを並べる |

> **なぜ linter と分けたのか**: 「import の順序が違う」のは**バグではない**からです。
> linter のエラーとして出すと本物のバグが埋もれる。assist に切り出すことで、
> 「保存時に勝手に直ってほしいもの」と「人間が判断すべきもの」を分離できます。

---

## Prettier / ESLint との対応表

既に Prettier / ESLint を知っているなら、この表だけで大体操作できます。

| やりたいこと | Prettier / ESLint | Biome |
|---|---|---|
| 整形の差分を見る（書き換えない） | `prettier --check .` | `biome format .` |
| 整形を適用する | `prettier --write .` | `biome format --write .` |
| lint する | `eslint .` | `biome lint .` |
| lint の自動修正 | `eslint --fix .` | `biome lint --write .` |
| 危険な自動修正まで含める | （`--fix` に区別なし） | `biome lint --write --unsafe .` |
| 全部まとめて | `prettier --write . && eslint --fix .` | **`biome check --write .`** |
| CI で検査（書き換え禁止） | `prettier --check . && eslint .` | **`biome ci .`** |
| 設定ファイル | `.prettierrc` + `eslint.config.js` | **`biome.json` 1 枚** |
| 除外設定 | `.prettierignore` + `.eslintignore` | `files.includes` の `!` / `vcs.useIgnoreFile` |
| 1 行だけ無効化 | `// eslint-disable-next-line rule` | `// biome-ignore lint/group/rule: 理由` |
| 整形の無効化 | `// prettier-ignore` | `// biome-ignore format: 理由` |
| ルールの意味を調べる | ドキュメントを検索 | **`biome explain ルール名`** |
| 既存設定からの移行 | — | `biome migrate eslint` / `biome migrate prettier` |

**Biome は Prettier と 97% 互換**を目標にしています。残りの 3% は意図的な非互換なので、
Prettier から移ると差分が少し出ます。

> **Biome ならではの便利なもの**は 2 つ。
> `biome explain useHtmlLang` でルールの説明・デフォルト重大度・fix の有無をターミナルで読めること。
> そして `$schema` を書いておけばエディタが `biome.json` を補完・検証してくれることです。

---

## Biome 1.x → 2.x の破壊的変更

**日本語のブログ記事はまだ 1.x 前提のものが多いので、ここは必ず押さえてください。**
1.x の設定をそのまま書くとエラーになります。

| 1.x | 2.x（= このプロジェクト） |
|---|---|
| `files.include` と `files.ignore` の 2 つ | **`files.includes` に統合**。除外は `!` を前置（`["**", "!**/dist"]`） |
| トップレベルの `organizeImports` | **`assist.actions.source.organizeImports`** に移動 |
| `linter.rules.recommended` のみ | `recommended` に加えて **`linter.rules.preset`**（`recommended` / `all` / `none`）が追加 |
| `ignore` 系の個別オプション多数 | `vcs.useIgnoreFile` で `.gitignore` をそのまま使える |
| 型を見るルールは不可（tsc が必要） | **`types` domain** で tsc 無しの型推論ルールが使える |
| — | **`domains`** 追加（フレームワーク単位でルール束を on/off） |
| — | **GritQL プラグイン**で独自ルールが書ける |
| — | 複数ファイルを横断する解析（import 先の定義を見る） |

1.x の設定ファイルが手元にある場合は、変換コマンドがあります。

```console
$ pnpm exec biome migrate --write
```

---

## 対応言語

| 言語 | format | lint | 備考 |
|---|---|---|---|
| JavaScript / JSX | ✅ | ✅ | |
| TypeScript / TSX | ✅ | ✅ | |
| JSON | ✅ | ✅ | |
| JSONC | ✅ | ✅ | `tsconfig.json` など既知のファイルは自動で JSONC 扱い |
| CSS | ✅ | ✅ | |
| GraphQL | ✅ | ✅ | |
| HTML | ⚠️ | ⚠️ | `html.experimentalFullSupportEnabled` が必要 |
| Vue / Svelte / Astro | ⚠️ | ⚠️ | 実験的。`<script>` ブロックのみなど制限あり |
| Markdown / YAML | ❌ | ❌ | **未対応**（2.5.15 時点） |

このプロジェクトで実際に検査対象になるのは **TSX / TS / JSON / JSONC / CSS** です。
Markdown が未対応なので、**このドキュメント自体は Biome の検査対象外**です。

---

次は [02-setup-handson.md](./02-setup-handson.md) で実際に設定を作ります。
