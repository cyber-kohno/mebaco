---
title: Slot
description: 名前を持つ差し込み領域の定義と、差し込み内容に渡すProps。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Slot（kind: `slot`）は、Componentが呼出側へ公開する差し込み領域の定義です。定義、表示位置、呼出側の内容は別の要素で管理します。

| 要素 | 置く場所 | 役割 |
| --- | --- | --- |
| Slot | 定義側ComponentのSlots | 領域の名前とProps |
| Slot Use | 定義側ComponentのElements | 差し込みを表示する位置と渡す値 |
| Slot Content | 呼出側Component UseのSlots | 実際に差し込む表示内容 |

## 配置場所と操作

Componentで `Use slots` を選び、作られたSlotsを右クリックして `Add slot` を選びます。Slotの変更は `Modify`、削除は `Delete` です。

## 子要素

Slot作成時にPropsが自動作成されます。このPropsは、Slot Useから差し込み内容へ渡す値を定義します。表示用TagやTextはSlot定義へ直接置きません。

## 設定項目

| 表示名 | 既定値 | 制約 |
| --- | --- | --- |
| Id | 空、必須 | 1〜32文字。英小文字で始め、英字・数字のみ。予約語と同じSlots内の重複は不可 |

例は `body`、`footer`、`itemDetail`。内部には表示名と別の `slotId` が生成されます。通常の名前変更では内部識別子が維持されます。

## 参照とスコープ

同じComponent内で追加するSlot Useの候補になります。呼出側が渡す内容の中では、SlotのPropsが `$props` です。Component本体のPropsをそのまま渡す契約ではありません。

## 実行時の動作

Component UseがSlot定義を内部識別子で対応付け、Slot Contentを作ります。Slot Useが表示位置でPropsを解決し、対応するSlot Contentを表示します。

## 最小例

Slot bodyを作り、Propsにstring型のcaptionを追加します。Slot Useのcaptionに文字を渡すと、呼出側のSlot ContentのTextで `$props.caption` を表示できます。

## 制約と注意点

- Slotを削除して同じIdで作り直しても、内部識別子は別です。元の差し込み内容の再接続は保証されません。
- Slot定義やPropsの変更後は、既存のComponent UseとSlot Useの両方を確認してください。
- 現行Runtimeの表示位置・フォールバックの制約は[Slot Use](/reference/elements/slot-use/#制約と注意点)を参照してください。

## 関連項目

- [Slots](/reference/elements/slots/)
- [Value Prop](/reference/elements/value-prop/)
- [Slot Use](/reference/elements/slot-use/)
- [Slot Content](/reference/elements/slot-content/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="slot" />
