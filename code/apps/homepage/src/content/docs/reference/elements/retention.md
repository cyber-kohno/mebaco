---
title: Retention
description: 描画前に値と処理を準備するRetentionの評価順、変数フレーム、State更新の制約。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Retention（kind: `retention`）は、表示内容が使う変数・定義・処理をまとめる、画面に直接出ない領域です。名前から「実行値を永続保存する場所」と解釈しないでください。描画の再評価に伴って処理されます。

## 配置場所と操作

Component作成時に自動で作られます。子を持てるTag、Slot Contentなどの表示ホストでは `Use retention` によってRetentionとElementsの組に切り替えられます。

Retentionの右クリックで `Add declare`、`Add statement`、`Add directive`、`Add block` を使います。

## 子要素

| メニュー | 追加対象 |
| --- | --- |
| Add declare | Variable、Function、Local component、Style、Object、Union、Signature |
| Add statement | Action、Transition |
| Add directive | 処理用のConditional、Switch |
| Add block | 処理をまとめるBlock |

TagやTextなどの表示内容は、隣のElementsへ置きます。処理用Conditional / Switchは、表示要素のConditional / Switchとは別のkindです。

## 設定項目

Retention自体に編集フィールドはありません。各子要素で名前、式、コード、型などを設定します。変数を作る場合は `Add declare → Variable` でIdとInitialの式を指定します。Mutableオフはconst、オンはletとして扱います。

## 参照とスコープ

Variableは `$var.<Id>` から読みます。同じRetention内では処理順を確認し、参照する変数の宣言を先に置きます。解決後のコンテキストはそのホストのElementsへ渡されます。

子ホストの評価では親の変数を引き継いだ新しいフレームを作ります。子で引き継いだlet変数へ再代入しても、親フレームの値は置き換わりません。これはオブジェクトの深いコピーや、参照先全体の分離を保証する説明ではありません。

可視なローカルComponentやFunctionなどの定義は、対応する参照・名前解決で利用します。ローカルComponentはEntryの直接の候補ではありません。

## 実行時の動作

VariableとActionをツリー順に評価し、処理用分岐では選ばれた枝を評価します。Blockは同じフレーム内で順に展開され、Blockだけで新しい変数スコープを作るわけではありません。無効化された処理はスキップします。

Retention中のStateは読み取り用です。Variableの式、Action、呼び出したFunctionでもStateの更新は禁止されます。一方、Mutableで作ったRetentionのlet変数はActionなどから変更できます。constへの再代入、型不一致、式や処理の失敗は診断され、その表示領域の評価を中断します。

## 最小例

Panelにstring型のProp titleを作り、RetentionにVariableを追加します。

| 項目 | 設定 |
| --- | --- |
| Id | `captionText` |
| Mutable | オフ |
| Specify Value Type | オフ（この例では推論） |
| Initial | 式 `$props.title + 'の内容'` |

ElementsのTextの式や、Slot UseのProps割当て式から `$var.captionText` を読みます。

## 制約と注意点

- クリックごとに1回だけ実行する処理の置き場ではありません。再評価で繰り返され得るため、イベントActionと使い分けてください。
- 値を実行中に保持して更新したい場合はState、実行をまたいで保存したい場合はStorageなど、別の仕組みを使います。
- Retention直下の処理は同期評価です。awaitで待つ非同期処理は、対応するイベントActionやEffectなどへ分けてください。
- 任意の副作用がすべて隔離されるセキュリティ境界ではありません。描画準備では値の計算を基本にしてください。
- 任意Retentionを外せるのは、Retentionが空など、構造上の条件を満たす場合です。Componentの基本構造から取り外す操作ではありません。

## 関連項目

- [Component](/reference/elements/component/)
- [Value Prop](/reference/elements/value-prop/)
- [State](/reference/elements/state/)
- [Slot Use](/reference/elements/slot-use/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="retention" />
