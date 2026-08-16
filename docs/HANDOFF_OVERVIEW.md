# Mebaco 開発引き継ぎメモ

## 目的

Mebaco は、ツリーで UI・状態・型・スタイル・処理を組み立て、その場で実行確認できるデスクトップ開発環境です。

旧プロダクトである Front Driven の価値を引き継ぎつつ、データ構造・型安全性・式評価・編集 UX・ランタイムの堅ろう性を作り直すことを目的としています。

大きな方向性は次の通りです。

- フロントエンドアプリを、コードファイルではなく構造化されたツリーとして編集する。
- 作成したツリーをランタイムで即時プレビューできる。
- GUI 編集と TypeScript 式入力を共存させる。
- 旧 Front Driven の便利な体験は基本的に踏襲する。
- 旧 Front Driven の力技だった部分は、Mebaco では型・データ構造・ランタイム層で改善する。

## 技術スタック

メインアプリは `apps/studio` です。

- Tauri 2
- Svelte 5
- TypeScript
- Vite
- Vitest
- Monaco Editor
- JSZip

Tauri アプリとしての表示名は `Mebaco`、識別子は `com.mebaco.studio` です。プロジェクトフォルダ名は将来的な `homepage` や `cli` 追加を見越して `studio` にしています。

## アプリの基本方針

### フォルダと命名

新規実装は原則として `apps/studio/src/system` 配下に集約します。

命名規則は次の通りです。

- TypeScript ファイルとフォルダは小文字ケバブケース。
- Svelte コンポーネントは PascalCase。
- TypeScript は基本的に 1 ファイル 1 default export。
- 関連する型や関数が増える場合は namespace にまとめる。
- `screen-store` など一部のストアは例外的に named export を許容しています。

`App.svelte` はアプリ本体を直接実装せず、`system/AppRoot.svelte` を参照する入口に留めます。

### 画面構成

画面は大きく次の流れです。

- `start`: 開始画面。
- `develop`: 開発画面。
- `preview`: 開発画面上に重ねるプレビュー実行ダイアログ。

ヘッダはアプリルートに配置し、画面ごとに表示するボタンを切り替えます。

- Start では Restart のみ。
- Develop では Save / Close / Restart。

ショートカットは `system/keyboard` に集約し、画面・ダイアログ状態に応じて制御します。

### 見た目

Mebaco は開発環境ですが、ダークテーマではなく、水色系をベースにした柔らかいライトテーマを採用しています。

長時間使えること、ツリー構造が読み取りやすいこと、Front Driven の視認性を損なわないことを重視します。

共通の CSS 変数やフォーム幅は `app.css` と UI 共通部品側で管理しています。意図しないブラウザ標準の余白やフォントサイズを避けるため、アプリ本体・ランタイムルートともにリセットを強めに入れています。

## プロジェクトファイル

開発用プロジェクトは `.mbc` ファイルです。

現時点では、独自バイナリではなく ZIP コンテナを採用しています。

中身は基本的に次の構成です。

```text
manifest.json
project.json
assets/
```

`manifest.json` には `format`, `appVersion`, `schemaGen`, `apiGen` を持ちます。

`project.json` には現在のツリー状態を保存します。現時点では `rootNode` をそのまま保存する方式です。

将来的には次の形式も追加可能な前提です。

- 開発用フォルダエクスポート
- リリース用 ZIP コンテナ
- 署名付きリリースファイル

ただし、今は `.mbc` の開発保存を優先しています。

## 中心概念

### Project / App / Launcher

Mebaco では「プロジェクト = 1 アプリ」にはしません。

必ず次の関係を前提にします。

```text
Project
  Apps
  Launchers
  Common
```

App と Launcher は並列の概念です。

Launcher は App の中にあるものではなく、App を起動する入口です。将来的にリリース出力は Launcher 基準で行います。

この構造により、同じ App を本番用・テスト用・権限別など複数の Launcher から起動できます。Front Driven で後付けして苦労した部分なので、Mebaco では最初から守る重要方針です。

現時点では Launcher の詳細実装はまだ薄く、App 単体プレビューを優先しています。

### Element

ツリー上の各ノードは Element を持ちます。

旧 Front Driven の `WrapElement` 的な思想は残しつつ、Mebaco では `kind` による TypeScript union で安全に扱います。

各 kind は `system/element/kind` 配下に分類されています。

主な分類は次の通りです。

- `project`: Project / Apps / Launchers / Common
- `app`: App / Entry
- `component`: Component / Props / Retention / Elements
- `declare`: Components / Styles / Types / Functions などの管理箱
- `view`: Tag / Text / Style / Style Parameter
- `directive`: Conditional / Switch / Loop
- `variable`: State / Variable / Action
- `type`: Object Type / Union Type / Type Expression
- `block`: 透明コンテナとしての Block

Element の定義は `ElementDefinition` に寄せます。

Element ごとに次を定義します。

- 生成方法
- ツリーラベル
- 編集スキーマ
- アクションメニュー
- 子要素を持てるか
- 初期子要素

単純なフォルダ系要素は、個別コンポーネントを作らず静的定義で済ませる方針です。

### Tree

ツリー UI はサードパーティを使わず、自前実装しています。

理由は、Front Driven と同等以上に細かい操作感・見た目・仮想追加・編集中表示・枝線・独自コンテキストメニューを制御するためです。

現在できていること:

- ノード選択
- 開閉
- キーボード移動
- 先祖・兄弟・編集中ノードの視覚表示
- 仮想追加ノード表示
- 独自アクションメニュー

アクションメニューも自前実装です。複数階層メニュー、ホバーによる子メニュー、親メニューの active 表示を持ちます。

## 編集ダイアログ

要素編集は汎用の `ElementDialogLayer` とスキーマ定義で実現します。

要素ごとに編集コンポーネントを直実装するのではなく、基本項目はスキーマで定義します。

ただし、Object Shape、Style Properties、Style Bases、Attributes など、高度な専用 UI が必要なものは専用 Svelte コンポーネントを使います。

方針:

- 基本項目は汎用フィールド。
- 高度な項目だけ専用エディタ。
- Formula 入力は共通部品化。
- Monaco 全画面編集は共通部品から呼ぶ。
- 行数が増える領域はダイアログ全体ではなく内部領域だけスクロールする。
- 必須や不正入力はフィールド単位で視覚表示する。

## Formula / Monaco

式は Front Driven の重要な改善対象です。

Front Driven では文字列置換のプレースホルダ方式でしたが、Mebaco では式評価コンテキストへ値を注入します。

現在の方針:

- TypeScript 風の式を書ける。
- 小さい入力欄から全画面 Monaco へ展開できる。
- `$state`, `$param`, `$props`, `$args`, `$function`, `$system`, `$var`, `$event` などの注入スコープを使う。
- Monaco 補完・型情報も注入する。
- ランタイム評価は `system/runtime/formula` と `system/runtime/script` に分離する。
- 設計支援や補完用の情報生成は UI 側、実行時評価は runtime 側に寄せる。

式の戻り値は、用途に応じて呼び出し側で検証します。たとえば Style Formula は CSS 値として文字列を返すことを期待します。

## Runtime / Preview

`system/runtime` は、ツリーを実際に評価・描画する層です。

プレビュー実行は `preview` という言葉に統一しています。Vitest の `test` と混ざらないように、UI 上の実行確認は `preview`、自動テストは `test` と分けます。

主な構成:

- `RuntimeView.svelte`: プレビュー全体。
- `preview/PreviewDialog.svelte`: プレビューダイアログ。
- `render/ElementDispatcher.svelte`: Element kind ごとの描画振り分け。
- `render/RenderTag.svelte`: Tag 描画。
- `render/RenderText.svelte`: Text 描画。
- `render/RenderConditional.svelte`: Conditional 描画。
- `render/RenderSwitch.svelte`: Switch 描画。
- `render/RenderLoop.svelte`: Loop 描画。
- `render/RenderBlock.svelte`: Block 描画。
- `runtime-state.ts`: State 評価。
- `runtime-props.ts`: Component props 評価。
- `variable/variable-frame.ts`: `$var` スコープ。
- `retention/retention-resolver.ts`: Retention 評価。
- `style/style-resolver.ts`: Style 解決。

ランタイムは将来的にかなり複雑になります。Element と対になる描画コンポーネントは `RenderXxx`、kind の振り分けは `ElementDispatcher` という命名にしています。

## Style

Style は Mebaco の重要機能です。Front Driven の良い部分をかなり引き継ぎつつ、データ構造と評価を整理しています。

現在の主な仕様:

- Style は ID を持つ再利用可能な定義。
- Style Property は Literal / Formula を持つ。
- Style Parameter を定義できる。
- 継承を持てる。
- 継承時に Parameter を Default / Set / Delegate で解決できる。
- Set の値は Literal / Formula を選べる。
- `:hover` などの状態別上書きを扱える。
- Style Monitor で最終適用結果を確認できる。
- CSS プロパティ候補、値候補、色スウォッチ、簡易カラーピッカーを持つ。

Style Formula は `$param.xxx` と `$state.xxx` などを参照できます。

Style は「自由すぎる CSS エディタ」ではなく、実務で必要な範囲を統制して扱う方針です。ネストは現時点では `:hover` など現実的な状態に絞っています。

## Type / Object / Union

Front Driven の Struct は Mebaco では `Types` に整理しました。

Rust 的な `Struct` より、TypeScript 開発体験に近い `Type` を重視しています。

現在の主な型機能:

- Object Type
- Union Type
- Object property の optional
- Object reference union
- string / number literal union
- Object inheritance / merge
- Inline object shape
- State / Variable / Object property での共通 Value Type 指定

Object 編集は、1 要素内に独自のツリーエディタを持つ方式です。

メインツリー上に細かいプロパティ要素を大量に生やすのではなく、Object 要素の編集画面内で TypeScript の定義に近い形で確認・編集できる UX を採用しています。

Union は名前付きで定義でき、State / Variable / Object property から参照できます。さらに、string / number / object を選んだ場面ではインライン Union も定義できます。

## State / Variable / Retention

State は永続的な変数です。

Variable は Retention 内などで使う一時的な変数です。

方針:

- State は永続変数なので、型は明示する。
- Variable は推論型と明示型を選べる。
- Variable は再評価ごとに作られるスコープ値。
- ただし mutable 変数も扱えるようにする。
- 子要素の Retention から親スコープの変数を更新できる余地を持つ。

注入名は次のように分けます。

- `$state`: App の状態。
- `$var`: Retention などで定義される変数。
- `$param`: Style parameter。
- `$props`: Component props。
- `$event`: イベント処理時のイベント引数。

## View / Directive

View 系:

- Tag
- Text

Directive 系:

- Conditional
- Switch
- Loop

Tag は `tagName`, `comment`, style bindings, attributes, children を持ちます。

Text は plain text と formula を選べます。

Conditional は `if / else if / else` の一般的な構造に寄せています。Front Driven の `Accept` よりプログラミング用語に近い名前へ改善しています。

Switch は string / number / literal union を扱える方向です。Case は重複値を許容しない方針です。

Loop は count ベースと collection ベースの両方を想定しています。collection ベースでは式から型推論し、item 変数を補完に出せる方向へ進めています。

Block はスコープを持たない透明コンテナです。評価時は中身を順に展開するだけで、関連要素をまとめて並び替えるために使います。

## Component / Props / Entry

Component は再利用単位です。

現在の構成:

```text
Component
  Props
  Retention
  Elements
```

Props は現時点では値 Props を中心に実装しています。関数 Props は将来 Function 要素を設計するときに合わせて詰めます。

Entry は App の起動コンポーネント指定です。保存データと見た目を揃えるため、App の単なるプロパティではなく、Front Driven と同じく独立した要素として扱っています。

Entry でも Component props と同じように引数指定できる方針です。

## 保存データと UI 状態

開発用 `.mbc` は今のところツリー状態も含めた `rootNode` を保存しています。

将来的には、保存データとしての純粋なプロジェクト構造と、ツリーの開閉・選択などの workspace UI 状態を分ける余地があります。

ただし現在は MVP 開発を優先しており、破壊的変更は許容しています。

リリース後は `schemaGen` と `apiGen` による互換管理を明確にします。

## 旧 Front Driven との関係

Front Driven は必ず参考にします。

ただし、完全コピーではありません。

引き継ぐもの:

- ツリー中心の開発体験。
- App と Launcher の並列構造。
- Component 再利用。
- Style の再利用・継承・Parameter。
- Retention による局所的な処理領域。
- Preview 実行。
- 自前ツリー、自前メニュー、自前編集 UX。

改善するもの:

- `any` に寄った汎用構造。
- 文字列置換の式注入。
- 小さい Monaco しか使えない UX。
- 保存前にプログラムを書きづらい UX。
- ランチャー引数の受け皿不足。
- 型・変数・Style の整合チェック不足。
- ランタイム評価の見通しの悪さ。

仕様判断で迷う場合は、まず Front Driven の挙動を確認し、明らかに悪い・MVP コストが高すぎる・Mebaco の方針と衝突する場合のみ、相談して変える方針です。

## 作業時の注意

### 仕様変更は事前相談

このプロジェクトでは、Front Driven 踏襲が基本です。

仕様を変える場合は、実装前に理由を説明して相談します。

### データ構造は少し先を見越す

UI は MVP で小さく始めてもよいですが、データ構造は後で大きく壊れないように設計します。

特に次は早めに考慮します。

- Style Parameter
- Formula
- Type / Object / Union
- Component props
- Launcher args
- Runtime scope

### UI は実務のテンポを重視

安全な UI でも、操作テンポが落ちすぎるものは避けます。

たとえば Style Property はレコードごとの確定制より、現在の直接編集型をベースに、補完・検証・Monitor を強化する方向を選んでいます。

### テスト

自動テストは Vitest です。

コマンド:

```text
npm run check
npm run build
npm run test
```

実行場所:

```text
apps/studio
```

UI プレビュー実行は `preview`、Vitest は `test` と呼び分けます。

## 現時点でまだ大きく残っている領域

細かい実装状況はコードを確認してください。大きな残件としては次があります。

- Launcher 本体と Launcher args。
- App 間遷移。
- Function 要素。
- ComponentUse 要素。
- Slot / child component 受け渡し。
- Action / Event の本格化。
- Retention scope のさらなる整理。
- 保存データと workspace UI 状態の分離。
- リリース用エクスポート。
- Asset 管理。
- Style / Type / Runtime のテスト拡充。

ただし、現時点でも次の MVP 的な流れは動き始めています。

```text
Project を作る
App を追加する
Component / Entry を定義する
Tag / Text / Style / State / Type を定義する
Preview で表示とイベントを確認する
.mbc として保存・読み込みする
```

## 別環境で最初に見るとよい場所

```text
apps/studio/src/system/AppRoot.svelte
apps/studio/src/system/element/element.ts
apps/studio/src/system/element/element-registry.ts
apps/studio/src/system/element/element-definition.ts
apps/studio/src/system/tree/TreeView.svelte
apps/studio/src/system/element-dialog/ElementDialogLayer.svelte
apps/studio/src/system/runtime/RuntimeView.svelte
apps/studio/src/system/runtime/render/ElementDispatcher.svelte
apps/studio/src/system/project/project-file.ts
```

Style まわりを見る場合:

```text
apps/studio/src/system/element/kind/view/style-element.ts
apps/studio/src/system/element/kind/view/StylePropsEditor.svelte
apps/studio/src/system/element/kind/view/StyleBasesEditor.svelte
apps/studio/src/system/runtime/style/style-resolver.ts
apps/studio/src/system/runtime/style/style-monitor.ts
```

Type まわりを見る場合:

```text
apps/studio/src/system/element/kind/type/type-expression.ts
apps/studio/src/system/element/kind/type/object-shape.ts
apps/studio/src/system/element/kind/type/ObjectShapeEditor.svelte
apps/studio/src/system/element/kind/type/union-definition.ts
apps/studio/src/system/element/kind/type/ValueTypeEditor.svelte
```

Formula / Monaco まわりを見る場合:

```text
apps/studio/src/system/ui/formula
apps/studio/src/system/ui/monaco
apps/studio/src/system/runtime/formula
apps/studio/src/system/runtime/script
```

