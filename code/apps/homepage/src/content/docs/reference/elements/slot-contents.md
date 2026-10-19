---
title: Slot Contents
description: Component使用箇所に自動生成されるSlotsフォルダーと同期時の注意。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Slot Contents（kind: `slot-contents`）は、Component使用箇所の差し込み内容をまとめるコンテナーです。ツリーの表示名は `Slots` です。定義側のSlots（kind: `slots`）とは役割が異なります。

## 配置場所と操作

Slotを持つComponentをComponent Useで参照すると、その使用要素の下に自動生成されます。使用要素の `Refresh slots` で定義と同期します。このフォルダー自身の右クリック操作はありません。

## 子要素

参照先のSlotに対応する[Slot Content](/reference/elements/slot-content/)を持ちます。

## 設定項目

設定欄はありません。どのSlotに対応するかは参照先Componentから決まり、表示内容は各Slot Contentへ追加します。

## 参照とスコープ

各Slot Contentは、名前ではなくSlotの内部識別子で対応付けられます。差し込みのPropsはここでは定義せず、定義側のSlot / Propsで設定します。

## 実行時の動作

Component Useがここから内容を集め、定義側のSlot Useへ渡します。フォルダー自体がHTML要素になるわけではありません。

## 最小例

```text
Main / Elements / Component Use: Panel
└─ Slots（kind: slot-contents）
   └─ body（kind: slot-content）
      └─ Text: 差し込む文字
```

## 制約と注意点

Refresh slotsは定義の順番と内部識別子に合わせます。同じ識別子の内容は維持され、新しいSlotは空で生成され、定義にないSlotの内容は取り除かれます。参照先にSlotがなくなるとフォルダーも除去されます。同期・参照先変更の前に保存してください。

## 関連項目

- [Slots（定義側）](/reference/elements/slots/)
- [Component Use](/reference/elements/component-use/)
- [Slot Content](/reference/elements/slot-content/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="slot-contents" />
