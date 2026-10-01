---
title: Effect
description: 初回表示と依存値の変化で実行される非同期Action。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Effect（kind: `effect`）は、Runtime上の表示が始まったときと、指定した依存式の値が変わったときにActionを実行します。画面表示前に毎回値を準備するRetentionとは使い分けます。

## 配置場所と操作

AppまたはComponentの `Store / Effects` に追加します。既存Effectを右クリックして `Modify` / `Delete` で編集します。Effectは無効化できます。

## 子要素

子要素はありません。Dependency式の一覧とActionコードをEffect自身に設定します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Comment | 任意のコメント。最大64文字 |
| Dependencies | 変化を監視する式の一覧。各式は値を返す |
| Action | 実行するコード。最大8,000文字、awaitを利用できる |

Dependencyを空にすると、初回表示時に実行するEffectになります。依存式を複数指定すると、いずれかの値が変わったときに再実行します。

## 参照とスコープ

Dependency式とActionはEffectの所有AppまたはComponentで見えるState、Props、Variable、Functionなどを使います。依存式は読み取り文脈で評価し、Effect ActionはStateを更新できる文脈で実行します。

## 実行時の動作

Effectの表示ホストがMountされた後、Dependency式の結果を評価します。初回は必ず実行対象になり、その後は各結果を前回値と比較します。Actionが実行中に依存値が変わると、以前の実行をAbort Signalで中断し、改めて実行します。

Effect Actionには `$effect.signal` があり、非同期処理の中止を伝えるのに使えます。Abort後はStateへの書き込みが無視されるため、非同期APIにも可能な範囲でSignalを渡してください。

## 最小例

Dependencyに式を登録します。

```ts
$state.userId
```

Actionでは、そのUserIdを用いた非同期処理を行い、結果をStateへ設定します。実際のAPIやエラー処理はアプリに合わせて構成します。

## 制約と注意点

- Dependencyの値が変わるたびに再実行されます。同じEffectが依存Stateを更新する場合は、更新ループに注意してください。
- 無限に近い連続更新を検出するとEffect実行が停止されます。
- Dependency式は値の同一性で比較されます。Objectの同じ参照を返したまま内部だけ変更する場合、変更の通知として扱われないことがあります。
- Abortは非同期処理が即座に停止する保証ではありません。API側もAbort Signalを扱い、古い結果を採用しないようにしてください。
- Effectの表示ホストが破棄されると、実行中処理へ中止を通知します。
- Effect ActionのState変更は失敗時に全て自動でロールバックされる契約ではありません。

## 関連項目

- [State](/reference/elements/state/)
- [Action](/reference/elements/action/)
- [Function](/reference/elements/function/)
- [Retention](/reference/elements/retention/)
- [式・コード](/reference/expressions/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="effect" />
