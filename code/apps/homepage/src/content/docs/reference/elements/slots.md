---
title: Slots
description: Componentが公開する差し込み領域の定義をまとめるSlots。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Slots（kind: `slots`）は、Componentが公開するSlotの定義をまとめます。Component使用箇所の下にも表示名がSlotsのフォルダーがありますが、そちらは[Slot Contents](/reference/elements/slot-contents/)という別の要素です。

## 配置場所と操作

Componentを右クリックして `Use slots` を選ぶと、Component直下に追加されます。Slotsを右クリックして `Add slot` で領域を定義します。

## 子要素

[Slot](/reference/elements/slot/)を持ちます。実際の表示内容をここに置くのではありません。

## 設定項目

Slots自体の設定欄はありません。各SlotでIdとPropsを定義します。Componentの `Remove slots` またはSlotsの `Delete` で定義群を取り除けます。

## 参照とスコープ

同じComponent内のSlot UseからSlotを選択します。SlotごとのPropsは、その差し込み内容へ渡す入力の定義です。

## 実行時の動作

Component Useはここに定義されたSlotに合わせて、使用箇所側の差し込み領域を同期生成します。表示場所は別途、ComponentのElementsにSlot Useを置いて指定します。

## 最小例

```text
Panel
├─ Slots / Slot: body
└─ Elements / Slot Use: body
```

## 制約と注意点

Slotsの削除後に使用箇所を同期すると、その差し込み内容が削除されます。定義を変更する前にProjectを保存してください。Slotsを作っただけでは画面に差し込み内容は表示されません。

## 関連項目

- [Slot](/reference/elements/slot/)
- [Slot Use](/reference/elements/slot-use/)
- [Slot Contents](/reference/elements/slot-contents/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="slots" />
