---
title: Variable
description: RetentionやFunction内で値を保持するconst / let宣言。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Variable（kind: `variable`）は、RetentionやFunctionなどの逐次処理範囲で使う名前付きの値です。`const`と`let`を選び、式・Action・後続の子要素から `$var.<Id>` で参照します。

## 配置場所と操作

Retention、Function Procedure、Promise Then / CatchなどVariableを追加できる範囲で、右クリックの `Add declare → Variable` を使います。Variableの右クリックで `Modify`、`Delete` ができます。Styleの一部ローカルVariableではMutableを選べません。

## 子要素

子要素はありません。Initialの式をVariable自身に設定します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 1〜32文字のJavaScript識別子。予約語と同じフレームの重複名は不可 |
| Mutable | オフは`const`、オンは`let` |
| Specify Value Type | オフは式から型を推論、オンはValue Typeを明示 |
| Initial | 必須の式。Functionのasync条件などに従いawaitを使える欄もある |

明示型では、Variableを作るときに評価値の型を検査します。`const` / `let`の選択は再代入可否であり、Object内容を深く不変にする設定ではありません。

## 参照とスコープ

`$var.<Id>` で読み書きします。Retentionでは前に宣言したVariableが後続の兄弟へ見えます。BlockはRetentionやFunction内の逐次スコープを区切りません。子Content Hostでは親のVariableを引き継いだ別フレームが作られる場合があります。

Loop Item / Index、Promise Thenの結果、Catchのエラーも局所的に `$var` へ加わります。宣言位置や分岐の外へ自動で漏れるものではありません。

## 実行時の動作

Retentionは表示領域を準備するたびVariable式を評価します。描画を伴う再評価で値も再計算されるため、Variableは実行をまたぐ保存領域ではありません。Function ProcedureのVariableはFunctionの呼び出しごとに作るフレームに属します。

明示したValue TypeはVariableの初期評価時に確認されます。`const`への再代入、宣言済みでない名前、型不適合、式エラーは診断になります。推論型と、その後の値に対する完全なRuntime検証を同一視しないでください。

## 最小例

Retentionへconst Variableを追加し、Id `captionText`、Initialに次の式を設定します。

```ts
$props.title + 'の内容'
```

後続するTextやProps割当てから `$var.captionText` を参照します。

## 制約と注意点

- 同じフレームで同じIdを再宣言できません。移動・改名時は式参照も確認します。
- `const`は再代入不可、`let`は再代入可能です。Variableの値を新しく計算したい場合は宣言の再評価を理解したうえで使います。
- 子ホストが引き継いだletを更新しても、親フレームの値そのものは置き換わりません。
- Stateと異なり、Variableの変更自体は画面更新通知を発生させません。
- StyleローカルVariableではMutableを利用できない箇所があります。

## 関連項目

- [Retention](/reference/elements/retention/)
- [Function](/reference/elements/function/)
- [State](/reference/elements/state/)
- [式・コード](/reference/expressions/)
- [型システム](/reference/types/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="variable" />
