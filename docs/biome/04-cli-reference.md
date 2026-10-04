# 04. CLI リファレンス

Biome 2.5.15 の CLI 辞書です。**通読不要。引いて使ってください。**

このプロジェクトでは `package.json` のスクリプト経由で呼ぶのが基本です（`pnpm check` など）。
直接叩くときは `pnpm exec biome ...` を使います。

---

## コマンド一覧

```console
$ pnpm exec biome --help
```

### ファイルを処理するコマンド（よく使う）

| コマンド | 何をするか | 書き込み |
|---|---|---|
| **`check`** | **整形 + lint + assist を一括検査。迷ったらこれ** | `--write` で可 |
| `lint` | lint のみ | `--write` で可 |
| `format` | 整形のみ | `--write` で可 |
| **`ci`** | **CI 用。検査のみで絶対に書き込まない** | **不可（フラグ自体が無い）** |

### 設定・調査のコマンド

| コマンド | 何をするか |
|---|---|
| `init` | `biome.json` を生成。`--jsonc` で `biome.jsonc` |
| `migrate` | 1.x → 2.x の設定移行。`migrate eslint` / `migrate prettier` で他ツールから取り込む |
| **`explain NAME`** | **ルールの説明・既定重大度・fix の有無を表示。一番使うべき調査コマンド** |
| `search PATTERN` | GritQL パターンでコードを検索（実験的） |

### 運用系のコマンド

| コマンド | 何をするか |
|---|---|
| `version` | CLI とデーモンのバージョン |
| `upgrade` | Biome を最新安定版に上げる（`package.json` 管理下なら pnpm を使うほうが安全） |
| `rage` | 環境・設定・デーモンの診断レポート。**バグ報告するときに使う** |
| `start` / `stop` | デーモンサーバの起動・停止 |
| `lsp-proxy` | エディタ拡張が使う LSP プロキシ |
| `clean` | デーモンのログファイルを削除 |

---

## `check` / `lint` / `format` / `ci` の違い

**ここが初学者の最大の混乱ポイント**なので、表で整理します。

| | `format` | `lint` | `check` | `ci` |
|---|---|---|---|---|
| 整形 | ✅ | ❌ | ✅ | ✅ |
| lint | ❌ | ✅ | ✅ | ✅ |
| assist（import 整列など） | ❌ | ❌ | ✅ | ✅ |
| `--write` / `--fix` | ✅ | ✅ | ✅ | **❌ 存在しない** |
| `--unsafe` | ❌ | ✅ | ✅ | **❌ 存在しない** |
| `--only` / `--skip` | ❌ | ✅ | ✅ | ✅ |
| `--staged` | ✅ | ✅ | ✅ | **❌ 存在しない** |
| `--changed` / `--since` | ✅ | ✅ | ✅ | ✅ |
| `--watch` | ✅ | ✅ | ✅ | **❌ 存在しない** |
| `--suppress` / `--reason` | ❌ | **✅ lint だけ** | ❌ | ❌ |
| `--threads` | ❌ | ❌ | ❌ | **✅ ci だけ** |

### 結論

- **日常は `check` だけでいい。** `format` と `lint` は「整形差分がノイズで lint だけ見たい」ときに使う
- **CI は必ず `ci`。** `--write` 系フラグが存在しないので、構造的に書き込み事故が起きない
- `--suppress` は `lint` にしかない（後述の「既存コードへの導入」で使う）

---

## 修正を適用するフラグ

| フラグ | 適用されるもの |
|---|---|
| `--write` | **safe fix** のみ。整形 + 安全な lint 修正 + 安全な assist |
| `--fix` | `--write` のエイリアス。完全に同じ |
| `--write --unsafe` | safe + **unsafe fix**。意味が変わる可能性あり |

```console
# 日常
$ pnpm exec biome check --write .

# 手で diff を読む覚悟があるときだけ
$ pnpm exec biome check --write --unsafe .
```

> **`--unsafe` を CI やコミットフックで自動実行しないこと。**
> 必ず手で実行して `git diff` を読んでください。

---

## 対象を絞るフラグ

| フラグ | 説明 |
|---|---|
| `--staged` | **`git add` 済みのファイルだけ。** ローカル用（コミットフック） |
| `--changed` | **既定ブランチと比べて変更されたファイルだけ。** CI 用。ステージ済み・未ステージの変更は含まない |
| `--since=REF` | `--changed` の比較基準を上書き。`--changed` と併用必須 |
| `--only=<GROUP\|RULE\|DOMAIN\|ACTION\|PLUGIN>` | 指定したものだけ実行。**`off` のルールも一時的に有効になる** |
| `--skip=<GROUP\|RULE\|DOMAIN\|ACTION\|PLUGIN>` | 指定したものを除外。**`--only` より優先される** |
| `--linter-enabled=<true\|false>` | lint を切る／入れる |
| `--formatter-enabled=<true\|false>` | 整形を切る／入れる |
| `--assist-enabled=<true\|false>` | assist を切る／入れる |
| `--enforce-assist=<true\|false>` | assist が未適用のとき失敗させるか（既定 `true`） |

### `--changed` と `--staged` の使い分け

```console
# ローカル: これからコミットする分だけ直す
$ pnpm exec biome check --write --staged

# CI: main と比べて変わった分だけ検査する
$ pnpm exec biome ci --changed --since=origin/main
```

`vcs.defaultBranch` を `biome.json` に書いておけば `--since` を省略できます。

---

## 出力を制御するフラグ

| フラグ | 既定 | 説明 |
|---|---|---|
| `--reporter=<FORMAT>` | `default` | **後述** |
| `--reporter-file=PATH` | — | レポータの出力をファイルに書く |
| `--max-diagnostics=<none\|N>` | `20` | 表示する診断の上限。`none` で無制限 |
| `--diagnostic-level=<info\|warn\|error>` | `info` | 表示する最小重大度 |
| `--error-on-warnings` | off | **警告でも exit code を 1 にする** |
| `--verbose` | off | 処理したファイル一覧と詳細を表示 |
| `--colors=<off\|force>` | 自動 | ANSI 色の強制 on/off |
| `--skip-parse-errors` | off | 構文エラーのファイルをスキップ（エラーにしない） |
| `--no-errors-on-unmatched` | off | **1 件もマッチしなくてもエラーにしない** |
| `--config-path=PATH` | 自動探索 | 設定ファイル（またはそのディレクトリ）を指定 |
| `--stdin-file-path=PATH` | — | 標準入力から読んで標準出力に書く（エディタ連携用） |
| `--profile-rules` | off | **ルールごとの実行時間を表示。** 遅いルールを特定できる |

### `--reporter` の選択肢

```
default | concise | summary | json | json-pretty | github | gitlab | junit | checkstyle | rdjson | sarif
```

| 値 | 使う場面 |
|---|---|
| `default` | 普段。差分とコード片が色付きで出る |
| **`summary`** | **「全体で何件あるか」だけ見たいとき。** ファイル名とルール名の集計のみ |
| `concise` | 1 件 1 行。grep したいとき |
| **`github`** | **GitHub Actions。** PR の差分にアノテーションが付く |
| `gitlab` | GitLab CI のコード品質レポート |
| `junit` / `checkstyle` | CI の既存レポート基盤に食わせる |
| `json` / `json-pretty` | 自前スクリプトで加工する |
| `rdjson` | reviewdog |
| `sarif` | GitHub Code Scanning に取り込む |

```console
# 全体像だけ把握する
$ pnpm exec biome check . --reporter=summary

# 上限 20 件を外して全部見る
$ pnpm exec biome check . --max-diagnostics=none

# エラーだけ見る（警告は無視）
$ pnpm exec biome check . --diagnostic-level=error
```

---

## `explain` — ルールを調べる

**ブラウザでドキュメントを探す前に、まずこれを打ってください。**

```console
$ pnpm exec biome explain useHtmlLang
```

```
Summary

- Name: useHtmlLang
- No fix available.
- Default severity: error
- Available from version: 1.0.0
- Diagnostic category: lint/a11y/useHtmlLang
- This rule is recommended

Description

 Enforce that `html` element has `lang` attribute.

Examples
 ...
```

分かること:

- **`No fix available.`** … 自動修正があるか。`--write` で消えない理由がここで分かる
- **`Default severity`** … `"on"` にしたときの重大度
- **`Diagnostic category`** … `biome-ignore` に書く文字列そのもの
- **`This rule is recommended`** … `preset: "recommended"` に含まれるか

デーモンのログ置き場も調べられます。

```console
$ pnpm exec biome explain daemon-logs
```

---

## `migrate` — 他ツールからの移行

```console
# 1.x の biome.json を 2.x の形式に変換
$ pnpm exec biome migrate --write

# ESLint の設定を取り込む
$ pnpm exec biome migrate eslint --write

# Prettier の設定を取り込む
$ pnpm exec biome migrate prettier --write
```

- `--write` なしだと**プレビューだけ**。まず付けずに実行して差分を見るのが安全
- **このプロジェクトでは不要**（ESLint も Prettier も入っていない）
- 仕事のプロジェクトに Biome を入れるときは**最初にこれを打つ**。
  既存の `.prettierrc` の `printWidth` や `singleQuote` がそのまま `biome.json` に変換されます

---

## `search` — パターンで検索する

```console
$ pnpm exec biome search 'console.log($args)'
$ pnpm exec biome search -l=javascript '`await $x`' src/
```

GritQL のパターンでコードを検索します（実験的機能）。
**GritQL プラグインで独自ルールを書く前の試行**に使うのが本来の用途です。
`grep` では書けない「構文を理解した検索」ができます。

---

## 実務レシピ

### 変更された分だけ検査する

```console
$ pnpm exec biome ci --changed --since=origin/main
```

既存の大きなプロジェクトに Biome を入れるときの定番。
**過去のコード全部を直さなくても、触った分だけ品質を上げられます。**

### 既存コードの違反に一括で抑制コメントを入れる（ベースライン化）

```console
$ pnpm exec biome lint --suppress --reason="Biome 導入時の既存違反。順次解消する" .
$ pnpm exec biome format --write .
```

`--suppress` は**修正を適用する代わりに `biome-ignore` コメントを書き込みます**（`lint` 専用）。
既存プロジェクトに後から Biome を入れるときの強力な手段です。

1. 既存の違反は全部抑制コメント化される → **CI がすぐ緑になる**
2. 新しく書くコードには最初からルールが効く
3. 抑制コメントを `grep` すれば「残っている技術的負債の一覧」になる
4. 手が空いたときに 1 つずつ外していく

> **注意 2 点。**
> ① 挿入直後はインデントが崩れるので、**必ず `format --write` を続けて実行**してください（実測で確認済み）。
> ② `--reason` を必ず付けること。理由のない `biome-ignore` は後から読む人（自分）が困ります。

### 1 つのルールだけ試す

```console
$ pnpm exec biome lint --only=style/useConst .
$ pnpm exec biome lint --only=complexity .          # グループ単位
$ pnpm exec biome lint --only=nursery/noFloatingPromises .
```

**`--only` は `"off"` にしているルールも一時的に有効化します。**
「このルールを入れたら何件引っかかるか」を事前に調べるのに最適です。
入れるか迷っているルールは、まず `--only` で件数を見てから決めましょう。

### うるさいルールを一時的に黙らせる

```console
$ pnpm exec biome check . --skip=style
```

`--skip` は `--only` より優先されます。

### 遅いときに原因を調べる

```console
$ pnpm exec biome check . --profile-rules
```

ルールごとの実行時間が出ます。`project` / `types` domain のルールは
複数ファイルを横断するので相対的に重くなります。

### 整形だけ・lint だけに絞る

```console
$ pnpm exec biome check . --linter-enabled=false    # 整形と assist だけ
$ pnpm exec biome check . --formatter-enabled=false # lint と assist だけ
```

設定ファイルを書き換えずに一時的に切れます。

### 保存するたびに再検査する

```console
$ pnpm exec biome check --watch .
```

エディタ拡張を入れていないときの代替。別ターミナルで動かしっぱなしにします。

### バグっぽい挙動に出会ったら

```console
$ pnpm exec biome rage
```

環境・設定・デーモンの状態がまとめて出ます。GitHub Issue に貼る用です。

---

## 終了コードと CI

| 状況 | exit code |
|---|---|
| 問題なし | `0` |
| `error` 重大度の診断がある | `1` |
| `warn` のみ（`--error-on-warnings` なし） | **`0`** |
| `warn` のみ（`--error-on-warnings` あり） | `1` |
| `info` のみ | **`0`** |
| 設定ファイルが不正 | `1` |
| 1 件もファイルがマッチしない | `1`（`--no-errors-on-unmatched` で `0`） |

**`warn` と `info` は既定では CI を止めません。** これは意図的な設計で、
「とりあえず可視化したいが、まだ止めたくない」ルールを `warn` にしておく運用ができます。
→ 詳しくは [05-linter-rules.md](./05-linter-rules.md) の段階的導入へ。

---

## 環境変数

| 変数 | 対応するフラグ |
|---|---|
| `BIOME_CONFIG_PATH` | `--config-path` |
| `BIOME_LOG_LEVEL` | `--log-level` |
| `BIOME_LOG_PATH` | `--log-path` |
| `BIOME_LOG_FILE` | `--log-file` |
| `BIOME_LOG_KIND` | `--log-kind` |
| `BIOME_LOG_PREFIX_NAME` | `--log-prefix-name` |

CI で設定ファイルの場所を切り替えたいときに `BIOME_CONFIG_PATH` が使えます。
