# 05. Lint ルールの運用

ここは**通読してください。** 設定の書き方よりも「**どう運用するか**」の話が中心です。
仕事のプロジェクトに Biome を入れるときに効くのは、ルールの知識よりこちらの判断です。

---

## 8 つのルールグループ

Biome 2.5.15 には **557 ルール**あり、8 グループに分かれています。

| グループ | ルール数 | 何を守るか | 既定の重大度 |
|---|---:|---|---|
| `correctness` | 99 | **確実に間違っている・無意味なコード。** 未使用変数、到達不能コード | error |
| `suspicious` | 120 | **間違っている可能性が高いコード。** `any`、`debugger`、二重比較 | error |
| `complexity` | 50 | **無駄に複雑なコード。** 冗長な条件、過剰なネスト | error |
| `style` | 99 | **一貫性・慣用表現。** 命名規則、`const` 優先 | **warn** |
| `a11y` | 38 | **アクセシビリティ。** `alt` 欠落、`lang` 欠落 | error |
| `performance` | 15 | **実行時効率。** バレルファイル、不要な再計算 | error |
| `security` | 6 | **セキュリティ。** `dangerouslySetInnerHTML` など | error |
| `nursery` | 130 | **不安定な新ルール。** 明示的に有効化しないと動かない | — |

覚えておくべき 3 点:

1. **`style` だけ既定が `warn`。** スタイルの好みは CI を止めるべきでないという設計です
2. **`nursery` はオプトイン。** `preset: "recommended"` には含まれません
3. **`correctness` と `suspicious` が本物のバグを捕まえる。** ここを切るのは最後の手段

```console
# グループ単位で何件引っかかるか調べる
$ pnpm exec biome lint --only=complexity .
```

---

## 重大度（severity）の 5 値

```jsonc
"linter": {
  "rules": {
    "suspicious": {
      "noExplicitAny": "error",   // ← この部分
      "noDebugger": "warn"
    }
  }
}
```

| 値 | 意味 | exit code への影響 |
|---|---|---|
| `"off"` | 無効 | — |
| `"on"` | 有効。**ルール既定の重大度**を使う | ルール次第 |
| `"error"` | エラー | **`1`（CI が止まる）** |
| `"warn"` | 警告 | **`0`**（`--error-on-warnings` を付けると `1`） |
| `"info"` | 情報 | **常に `0`** |

### これが運用の鍵です

**`warn` と `info` は既定では CI を止めません。** これは意図的な設計で、
「可視化はしたいが、まだブロックしたくない」ルールを置く場所です。

```
導入フロー:  info（見えるだけ）→ warn（気になる）→ error（止める）
```

既存プロジェクトにルールを追加するときは、この順に**昇格させていく**のが現実的です。
最初から `error` にすると CI が真っ赤になって、結局ルールごと切られます。

> `"on"` は「ルールが決めた既定値を使う」という意味です。
> `biome explain ルール名` の `Default severity` で何になるか確認できます。

---

## `preset` と `recommended`

```jsonc
"linter": {
  "rules": {
    "preset": "recommended",     // 全体のプリセット
    "complexity": {
      "preset": "none",          // グループ単位で上書き
      "noUselessTernary": "error" // 個別ルールで上書き
    }
  }
}
```

| 値 | 意味 |
|---|---|
| `"recommended"` | Biome 推奨セット。**これが出発点** |
| `"all"` | **nursery 以外の全 427 ルール。** 実務では使わない |
| `"none"` | 全部オフ。個別に積み上げたいとき |

- **`preset` は 2.x で追加された書き方。** 1.x の `"recommended": true` も今も使えますが、新しく書くなら `preset`
- グループ単位（`complexity.preset`）、個別ルール、の順に細かく上書きできます

### `"all"` を使ってはいけない理由

427 ルールには `noTernary`（三項演算子禁止）、`noIncrementDecrement`（`i++` 禁止）、
`noMagicNumbers`（数値リテラル禁止）のような**好みが強く分かれるルール**が含まれます。
これらは「そういう方針のチーム」のためのもので、既定にすべきものではありません。

**実際にこのプロジェクトで試すと、こうなります。**

```console
$ pnpm exec biome lint . --reporter=summary   # preset: "all" にした状態
```

```
  lint/correctness/useImportExtensions               1 (1 warning)
  lint/style/useConsistentArrowReturn                1 (1 info)
  lint/style/noDefaultExport                         2 (2 warnings)
  lint/style/noJsxLiterals                           1 (1 info)
  lint/style/noHeadElement                           1 (1 warning)
```

たった 3 ファイルしかないのに 6 件。しかも**中身を見ると、どれも従ってはいけない指摘**です。

| ルール | 指摘箇所 | なぜ従えないか |
|---|---|---|
| `style/noDefaultExport` | `src/index.tsx` の `export default app` | **Cloudflare Workers のエントリは `export default` が必須。** 直したらデプロイできない |
| `style/noDefaultExport` | `vite.config.ts` の `export default defineConfig(...)` | **Vite の設定ファイルは `export default` が必須** |
| `style/noHeadElement` | `src/renderer.tsx` の `<head>` | **Next.js 向けのルール。** `next/head` を使えという意図。Hono SSR では `<head>` を書くのが正しい |
| `correctness/useImportExtensions` | `./renderer` | `moduleResolution: "Bundler"` なので拡張子は不要 |
| `style/noJsxLiterals` | `<h1>Hello!</h1>` | JSX に文字列を直接書くな（i18n 強制のためのルール） |

**6 件すべてが誤検知、または方針の押し付けです。** 本物のバグは 1 件も見つかっていません。

これが `"all"` の本質的な問題です。
`recommended` が見つけた `a11y/useHtmlLang` は**本物の問題**でしたが、
`"all"` で増えた 6 件は**ノイズしかない**。
ノイズが増えると本物のバグが埋もれ、最終的にチームは lint を無視するようになります。

入れたいルールは `--only` で件数と**中身**を見てから、1 つずつ足してください。

---

## ルールごとのオプション

一部のルールは挙動を設定できます。その場合は `{ "level": ..., "options": ... }` の形にします。

```jsonc
"linter": {
  "rules": {
    "complexity": {
      "noExcessiveCognitiveComplexity": {
        "level": "warn",
        "options": { "maxAllowedComplexity": 20 }   // 既定は 15
      }
    },
    "style": {
      "useNamingConvention": {
        "level": "warn",
        "options": {
          "strictCase": false,    // HTTPServer のような連続大文字を許す
          "requireAscii": true,
          "conventions": [
            { "selector": { "kind": "typeLike" }, "formats": ["PascalCase"] }
          ]
        }
      },
      "noRestrictedImports": {
        "level": "error",
        "options": {
          "paths": {
            "lodash": "lodash-es を使ってください",
            "node:fs": "Cloudflare Workers では使えません"
          }
        }
      }
    }
  }
}
```

**`noRestrictedImports` は仕事で特に効きます。** 「この依存は使うな」をレビューで毎回言う代わりに、
理由付きで機械に言わせられます。`paths`（完全一致）と `patterns`（グロブ）が指定できます。

> このプロジェクトなら **Cloudflare Workers で動かない Node 専用モジュール**を
> `noRestrictedImports` で禁止するのが実用的です。`node:fs` を import しても
> ローカルのビルドは通ってしまい、デプロイして初めて壊れるので。

オプションがあるかどうかは `biome explain ルール名` と、エディタの補完（`$schema` 経由）で分かります。

---

## `domains` — フレームワーク単位のルール束

**Biome 2.x の目玉機能です。** 「React を使っているなら React 向けルールを」といった束を
まとめて on/off できます。

```jsonc
"linter": {
  "domains": {
    "project": "recommended",
    "test": "recommended",
    "react": "none"
  }
}
```

値は **`"all"` / `"recommended"` / `"none"`** の 3 つ。

### 2.5.15 の全 15 ドメイン

| ドメイン | 自動有効になる条件 | 内容 |
|---|---|---|
| `project` | （常に判定） | リポジトリ横断の解析。未宣言の依存、import 循環など |
| `types` | （常に判定） | **tsc 不要の型推論ルール。** 2.x の新機能 |
| `test` | `jest` ≥26 / `mocha` ≥8 / `ava` ≥2 / `vitest` ≥1 | テスト固有のルール + テスト用グローバル |
| `react` | `react` ≥16 | React フック・JSX のルール |
| `reactNative` | React Native | |
| `next` | Next.js | |
| `solid` | Solid | |
| `svelte` | Svelte | |
| `vue` | Vue | |
| `qwik` | Qwik | |
| `astro` | Astro | |
| `tailwind` | Tailwind CSS | クラス名の検証など |
| **`drizzle`** | **`drizzle-orm` ≥0.9** | `where` 無しの `delete` / `update` を検出 |
| `playwright` | Playwright | |
| `turborepo` | Turborepo | |

### 自動有効化の仕組み

**`package.json` の依存を見て自動で有効になります。** 明示的に書かなくても効きます。

これは便利ですが、**暗黙的なので混乱の種**にもなります。
「なぜこのルールが動いているのか分からない」ときは、domain が自動で付いていないか確認してください。
意図を明示したいなら、使うものを明示的に書くのが良い習慣です。

### domain は nursery ルールを引き込む

重要な注意点です。domain に属するルールの**多くは `nursery` グループ**にあります。

- `types` ドメインの 19 ルールのうち 16 個が nursery
- `drizzle` ドメインの 2 ルールは**どちらも nursery**

つまり「nursery は使わない」という方針と domain は矛盾します。
**domain 経由で有効化するのが、これらの nursery ルールの正式な使い方**だと理解してください。
`nursery` グループを直接 `preset: "all"` にするのとは違います。

### テスト用グローバル

`test` ドメインを有効にすると `describe` / `it` / `expect` / `beforeEach` などが
**グローバルとして登録される**ので、`javascript.globals` に自前で書く必要がありません。
テストを書き始めたら真っ先に有効化してください。

### このプロジェクトでの判断

| ドメイン | 判断 | 理由 |
|---|---|---|
| `project` | ✅ **`"recommended"`** | 2.x の目玉。推奨セットなら誤検知が少ない |
| `types` | ⏸ 後で試す | 型推論が効くので強力。ただし重い。落ち着いてから |
| `test` | ⏸ `tests/` が埋まったら | 今はテストファイルが無い |
| **`react`** | ❌ **使わない** | **`jsxImportSource: "hono/jsx"` で React ではない。** `useExhaustiveDependencies` などが誤検知する |
| **`drizzle`** | 📌 **Drizzle 合流時に `"recommended"`** | `where` 無しの `delete` は本番でデータを全消しする。入れる価値が非常に高い |
| その他 | ❌ | 該当フレームワークを使っていない |

> **`project` / `types` は重い。** リポジトリ横断でモジュールグラフを作るので、
> ファイル単位の解析より時間がかかります。遅いと感じたら
> `biome check . --profile-rules` で確認してください。

> **`react` ドメインの誤検知が怖い理由。**
> Hono JSX は React と見た目が同じなので、`react` が有効だと
> 「フックの依存配列が不足している」など**存在しない問題**を報告します。
> `react` が `package.json` に無いので自動では付きませんが、
> 将来 React を部分的に入れるときは `overrides` でディレクトリを限定してください。

---

## safe fix と unsafe fix

| | 適用方法 | 意味 |
|---|---|---|
| **safe fix** | `--write` | 意味が変わらないと**保証されている** |
| **unsafe fix** | `--write --unsafe` | **意味が変わる可能性がある** |
| **fix なし** | 手で直す | ツールには判断できない |

ルール単位で挙動を指定できます。

```jsonc
"linter": {
  "rules": {
    "style": {
      "useConst": { "level": "error", "fix": "none" }   // 検出はするが自動修正しない
    }
  }
}
```

`"fix"` の値は `"none"` / `"safe"` / `"unsafe"` です。

**あるルールに fix があるかは `biome explain` で分かります。**

```console
$ pnpm exec biome explain useHtmlLang
# → No fix available.
```

このプロジェクトで唯一残った `a11y/useHtmlLang` が `--write` で消えなかったのは、
**fix が存在しないルールだったから**です（`lang` に何を入れるべきかはツールには分からない）。

---

## 抑制コメント

### 基本の形

```
biome-ignore <カテゴリ>: <理由>
```

**理由は必須です。** 省略すると Biome がエラーにします。
これは ESLint より厳しい設計ですが、良い設計です。半年後に読む自分が助かります。

### 4 つの種類

```ts
// ① 次の 1 行だけ抑制
// biome-ignore lint/suspicious/noExplicitAny: 外部 API の型が不定
const payload: any = await res.json()

// ② ファイル全体を抑制（ファイルの先頭に置くこと）
// biome-ignore-all lint/style/noDefaultExport: Vite の設定ファイルは default export 必須

// ③ 範囲を抑制
// biome-ignore-start lint/style/useNamingConvention: 外部 API のレスポンス形
const user_id = row.user_id
const created_at = row.created_at
// biome-ignore-end lint/style/useNamingConvention

// ④ 整形を抑制
// biome-ignore format: 行列として手で整列させている
const matrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
]
```

### カテゴリと粒度

カテゴリは **`lint` / `assist` / `syntax` / `format`** の 4 つ。
`lint` はさらに 3 段階の粒度で指定できます。

```ts
// biome-ignore lint: 全ルール（粗すぎる。避けるべき）
// biome-ignore lint/suspicious: グループ単位
// biome-ignore lint/suspicious/noDebugger: 個別ルール（← これを使う）
```

**必ず一番細かい粒度で書いてください。** `lint:` だけだと、
意図していなかった別の問題も一緒に見逃します。

### 言語ごとの書き方

```tsx
// TS/JS
// biome-ignore lint/suspicious/noExplicitAny: 理由

// JSX の中（// は使えない）
{/* biome-ignore lint/a11y/useHtmlLang: 理由 */}
<html>

/* CSS */
/* biome-ignore lint/correctness/noUnknownProperty: ベンダープレフィックス */

/* JSON / JSONC */
/* biome-ignore assist/source/useSortedKeys: 意味のある並び順 */
```

### ハマりどころ ⚠️

**`biome-ignore-all` はファイルの先頭に置かないと効きません。**
途中に書くと `suppression/unused` という診断が出ます（「使われていない抑制コメント」）。

この `suppression/unused` 診断は実は便利です。
**ルールを直したのに抑制コメントが残っている**と教えてくれるので、
掃除のタイミングが分かります。

---

## 既存プロジェクトへの段階的導入

**ここが「仕事で使える」の本題です。** 新規プロジェクトなら何も考えず `recommended` で始めればいい。
難しいのは、**既存の何万行かあるコードに後から入れる**ときです。

### 失敗パターン

```
1. biome init して preset: "all" にする
2. biome check . を実行する
3. 3,000 件のエラーが出る
4. 「Biome は使えない」と結論して削除する
```

これを避ける手順が以下です。

### Step 1: 移行設定を取り込む

```console
$ pnpm exec biome migrate prettier    # まず --write なしでプレビュー
$ pnpm exec biome migrate prettier --write
$ pnpm exec biome migrate eslint --write
```

既存の `printWidth` / `singleQuote` / `tabWidth` が `biome.json` に変換されます。
**整形スタイルを変えないことが最優先**です。ここで差分を出さなければ、
後の作業がすべて楽になります。

### Step 2: 整形だけ先に通す（lint は後回し）

```console
$ pnpm exec biome format --write .
$ git add -A && git commit -m "style: biome で全ファイルを整形"
```

- **整形だけの単独コミットにする。** 機能変更と混ぜない
- コミットハッシュを `.git-blame-ignore-revs` に書くと `git blame` が自動で飛ばしてくれる

```
# .git-blame-ignore-revs
# biome で全ファイルを整形
a1b2c3d4e5f6...
```

```console
$ git config blame.ignoreRevsFile .git-blame-ignore-revs
```

整形と lint を**同時に入れないこと**。問題を 1 つずつにします。

### Step 3: lint は `recommended` だけで始める

```jsonc
"linter": { "rules": { "preset": "recommended" } }
```

`"all"` は使わない。それでもエラーが大量に出たら Step 4 へ。

### Step 4: 件数を数えて、作戦を選ぶ

```console
$ pnpm exec biome lint . --reporter=summary --max-diagnostics=none
```

グループ別・ルール別の件数が出ます。これを見て選びます。

| 件数 | 作戦 |
|---|---|
| 〜50 件 | **全部直す。** 一番きれい |
| 50〜500 件 | **ルール別に `warn` へ降格** → 順に `error` に昇格 |
| 500 件〜 | **`--suppress` でベースライン化**、または **`--changed` で差分のみ** |

### 作戦 A: `warn` に降格して可視化する

```jsonc
"linter": {
  "rules": {
    "preset": "recommended",
    "suspicious": {
      "noExplicitAny": "warn"      // 500 件ある。今は止めない
    },
    "complexity": {
      "noExcessiveCognitiveComplexity": "info"  // 眺めるだけ
    }
  }
}
```

CI は通ります。件数が減ってきたら `warn` → `error` に昇格させます。
**ルールごとに独立して進められる**のが利点です。

### 作戦 B: `--suppress` でベースライン化する

```console
$ pnpm exec biome lint --suppress --reason="Biome 導入時の既存違反。順次解消する" .
$ pnpm exec biome format --write .
$ git add -A && git commit -m "chore: biome 導入時の既存違反に抑制コメントを付与"
```

既存の違反**すべて**に `biome-ignore` コメントが自動で挿入されます。

- **CI がすぐ緑になる。** 新しいコードには最初からルールが効く
- 残っている負債は `grep -rn "biome-ignore" src/` で一覧化できる
- 手が空いたときに 1 つずつ外していく

> `--suppress` の直後はインデントが崩れるので、**必ず `format --write` を続けて実行**してください。
> また `--reason` は必須ではありませんが、**必ず付けてください。**
> 理由のない抑制コメントは、後から読む人（＝半年後の自分）には暗号です。

**作戦 A と B の使い分け**: 特定のルールだけが大量に引っかかっているなら A。
いろいろなルールに散らばっているなら B。

### 作戦 C: 触った分だけ基準にする

```console
# CI
$ pnpm exec biome ci --changed --since=origin/main
```

過去のコードは放置し、**変更したファイルだけ**検査します。

- 一番導入コストが低い
- 「触ったところから少しずつ良くなる」方式
- 欠点: いつまでも古いコードが残る。A か B への移行計画とセットにする

### Step 5: ルールを 1 つずつ足す

入れたいルールは、**まず `--only` で件数を見る**。

```console
$ pnpm exec biome lint --only=nursery/noFloatingPromises . --reporter=summary
```

- 0 件 → すぐ `error` で有効化
- 少ない → 直してから `error`
- 多い → `warn` で入れる

**`--only` は `"off"` のルールも一時的に有効化する**ので、設定を書き換えずに試せます。

### Step 6: レガシーな領域は `overrides` で免除する

```jsonc
"overrides": [
  {
    "includes": ["src/legacy/**"],
    "linter": {
      "rules": {
        "complexity": { "preset": "none" },
        "style": { "preset": "none" }
      }
    }
  },
  {
    "includes": ["src/generated/**", "**/*.gen.ts"],
    "formatter": { "enabled": false },
    "linter": { "enabled": false }
  }
]
```

「捨てる予定のコードを綺麗にする」のは投資効率が悪いので、明示的に諦めます。
**`overrides` が 5 個を超えたら設計を疑ってください。**
ルールが厳しすぎるか、コードの分割が悪いかのどちらかです。

### Step 7: 設定をチームで共有する

リポジトリが 2 個以上になったら `extends` で共有します。

```jsonc
// 各リポジトリの biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "extends": ["@mycompany/biome-config"],
  "linter": {
    "rules": {
      "style": { "noDefaultExport": "off" }   // このリポジトリ固有の例外
    }
  }
}
```

設定をコピペすると**必ず乖離します。** 共有パッケージにすれば、
ルールの追加を 1 箇所の変更で全リポジトリに展開できます。

---

## 運用の原則（まとめ）

1. **`recommended` から始める。`all` は使わない**
2. **整形と lint は別々に導入する。整形コミットは単独で**
3. **`info` → `warn` → `error` と昇格させる。最初から `error` にしない**
4. **ルールを足す前に `--only` で件数を数える**
5. **`biome explain` を打つ癖をつける。** ドキュメントを探すより速い
6. **抑制コメントには理由を書く。** `--reason` を省略しない
7. **`biome-ignore` が増えたら、ルール自体を切るべきサイン**
8. **nursery グループを直接有効化しない。** ただし domain 経由は正式な使い方
9. **`overrides` は 5 個以内に収める**
10. **複数リポジトリになったら `extends` で共有する**

---

## このプロジェクトの次の一手

| タイミング | やること |
|---|---|
| **今** | `linter.rules.preset: "recommended"` + `domains.project: "recommended"`（[02](./02-setup-handson.md) で完了） |
| `tests/` を書き始めたら | `domains.test: "recommended"` を追加。`describe` / `it` が自動で認識される |
| **Drizzle が合流したら** | **`domains.drizzle: "recommended"` を追加。** `where` 無しの `delete` / `update` は本番事故に直結する |
| 落ち着いたら | `domains.types: "recommended"` を試す。`noFloatingPromises` は Hono のハンドラで効く |
| Workers 固有 API で怒られたら | `javascript.globals` に追加（`WebSocketPair` など） |
| Node 専用モジュールを禁止したいとき | `style/noRestrictedImports` の `paths` に `node:fs` などを登録 |
