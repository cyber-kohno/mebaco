---
title: Slot Content
description: 呼出側から差し込む表示内容と、Slot Props・呼出側Stateのスコープ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Slot Content（kind: `slot-content`）は、Componentを使う箇所ごとに用意する差し込み内容です。同じPanelを2つ使い、それぞれ別のTextやボタンを差し込めます。

## 配置場所と操作

Component UseのSlotsフォルダーに、参照先のSlotから自動生成されます。対象を右クリックして `Add view` などから表示要素を追加します。定義側の `Add view → Slot content` で作るSlot Useとは別です。

## 子要素

Tag、Text、Component使用、表示用制御要素、Blockを追加できます。`Use retention` でRetentionとElementsの構造に切り替えることもできます。

## 設定項目

Slot Content自身にIdやPropsの編集欄はありません。対応先は内部の `slotId` で管理されます。値の入力項目は定義側SlotのProps、値の割当てはSlot Useで設定します。

## 参照とスコープ

差し込み内容の `$state` や `$var` は呼出側のコンテキストを使い、`$props` はSlot Useから渡されたSlot Propsです。定義側ComponentのローカルStateやRetention変数を、そのまま参照する仕組みではありません。

## 実行時の動作

定義側ComponentのSlot Useがこの内容を表示します。Slot Content自体が画面の枠になるわけではありません。表示される位置に対応するSlot Useがない場合、ここへ内容を追加しても表示されません。

## 最小例

Slot bodyにstring型captionを定義し、Slot Useから文字列を渡します。呼出側のbodyにTextを追加し、式モードで次を入力します。

```ts
$props.caption
```

## 制約と注意点

- Slot Contentで定義側ComponentのStateを変えたつもりでも、実際には呼出側Stateを操作する可能性があります。スコープを確認してください。
- Slot変更・削除後のRefresh slotsで内容が取り除かれる場合があります。
- Slot Propsは呼出側Propsとの自動マージではありません。

## 関連項目

- [Slot](/reference/elements/slot/)
- [Slot Use](/reference/elements/slot-use/)
- [Slot Contents](/reference/elements/slot-contents/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="slot-content" />
