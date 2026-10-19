---
title: Slot Use
description: 差し込み内容の表示位置とPropsの割当て、現行Runtimeの配置制約。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Slot Use（kind: `slot-use`）は、Componentの中でSlotの内容を表示する位置です。画面の追加メニューでは `Slot content` と表示されますが、呼出側に自動生成されるSlot Contentとは別のkindです。

## 配置場所と操作

Slotを定義したComponentのElementsを右クリックして `Add view → Slot content` を選びます。Slotの候補がない場所では、この追加項目は出ません。ダイアログ名は `Create Slot Content`、変更は `Modify` です。

現行Runtimeで使う例は、ComponentのElements直下に置きます。エディターでさらに深い場所へ置けることと、Runtimeで内容を表示できることは同じではありません。

## 子要素

編集メニューにはTag、Text、表示用制御要素、Blockの追加があります。ただし現行RendererはSlot Use自身の子をフォールバック表示に使いません。呼出側のSlot Contentに内容を追加してください。

## 設定項目

| 表示名 | 既定値 | 内容 |
| --- | --- | --- |
| Slot | 最初の候補、必須 | 同じComponentのSlotを選択 |
| Props | 割当てなし | SlotのValue Propへ渡す固定値または式 |

Slotを変更するとPropsの割当てがクリアされます。既定値のないSlot Propは値の指定が必要です。

## 参照とスコープ

Slot Propsの式は定義側ComponentのStateやRetentionの変数を使って解決します。式内の `$props` は解決中のSlot Propsになるため、ComponentのPropsを使いたいときはRetentionで `$var` に取り出してから渡します。

差し込み内容を表示するときは呼出側のコンテキストを使い、その `$props` だけを解決したSlot Propsで置き換えます。差し込み内容の `$state` は呼出側、`$props` はSlotから渡された値です。

## 実行時の動作

Slotの内部識別子で定義と差し込み内容を検索し、Propsを解決してからSlot Contentを表示します。差し込み内容が見つからない場合は表示しません。内容がなくても、Slot Propsに必須値の不足などがあれば診断が起こる場合があります。

## 最小例

```text
Panel
├─ Slots / Slot: body / Props / caption（string）
├─ Retention / Variable: captionText
│  └─ Initial式: $props.title + 'の内容'
└─ Elements / Slot Use: body
   └─ Props欄 captionの式: $var.captionText
```

呼出側のSlot Contentに、Textの式 `$props.caption` を置きます。

## 制約と注意点

:::caution[現行実装の配置制約]
Tag、条件分岐、繰り返し、Switch、Blockの内側へ進む描画経路では、Slotの定義・内容・呼出側コンテキストが引き継がれない箇所があります。この段階のガイドではSlot UseをComponentのElements直下に置きます。深い配置の公開対応は配布ビルドで再確認する必要があります。
:::

- Slot Use自身の子は、差し込み内容がない場合の標準表示にはなりません。
- EntryはPropsを渡せますが、Component Useと同じSlot Contentの設定領域を持ちません。Slotを使う部品は、Mainなどの画面からComponent Useで利用する構成にしてください。
- Slot Propsは差し込み内容の `$props` を置き換えます。呼出側のPropsとの自動マージはありません。

## 関連項目

- [Slot](/reference/elements/slot/)
- [Slot Content](/reference/elements/slot-content/)
- [Component Use](/reference/elements/component-use/)
- [Retention](/reference/elements/retention/)
- [Componentを再利用する](/guides/reuse-components/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="slot-use" />
