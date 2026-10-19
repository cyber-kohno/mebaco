---
title: Constant
description: AppやCommonで利用する式から計算された定数。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Constant（kind: `constant`）は、式から値を計算し、Appの実行中に `$const.<Id>` で読む宣言です。StateやRetention Variableのようにユーザー操作で値を更新する用途ではありません。

## 配置場所と操作

`Common / Declares / Constants` または `App / Declares / Constants` に置きます。Constantsを右クリックして `Add constant`、既存項目の `Modify` / `Delete` で編集します。

## 子要素

子要素はありません。値の式をConstant自身に設定します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 1〜32文字の大文字スネークケース。英大文字で始まり、英大文字・数字・アンダースコアを使う |
| Specify Value Type | オフは式から型を推論、オンはValue Typeを明示 |
| Initial | 必須の式 |

## 参照とスコープ

Commonで定義したConstantはAppから参照できます。Appで定義した値はそのAppの式で使います。Constant式は `$const` を参照できますが、評価は定義順です。後に定義したConstantは、先行する式の評価時点ではまだ解決されていません。

## 実行時の動作

App起動時に可視なConstantを順に評価します。式の評価に失敗した項目はエラーとして記録され、その項目に有効値は設定されません。成功した値は `$const` 名前空間から読みます。

## 最小例

Constantsへ `WELCOME_MESSAGE` を追加し、Initialを式モードにして設定します。

```ts
'こんにちは'
```

Textなどの式から `$const.WELCOME_MESSAGE` と参照します。

## 制約と注意点

- ConstantはProject編集時の文字列置換ではなく、Runtimeで式を評価する値です。
- 参照するConstantは、定義順で先に評価されるよう並べます。
- 型の明示は式エディターの入力支援に使われます。現行Constant Runtimeは評価結果への明示型チェックをしていません。
- Constantの外側の名前空間は読み取り専用です。Object値の全階層が深く凍結されることまでは保証しません。
- 改名・削除時は式での参照を確認してください。削除前に確認ダイアログが出る場合があります。

## 関連項目

- [型システム](/reference/types/)
- [式・コード](/reference/expressions/)
- [App](/reference/elements/app/)
- [State](/reference/elements/state/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="constant" />
