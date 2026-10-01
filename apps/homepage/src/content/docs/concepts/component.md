---
title: ComponentとRetention
description: Component定義、利用箇所、Props、Slot、ローカルな宣言領域を説明します。
---

Componentは、UIと振る舞いをまとめて複数箇所から利用するための定義です。Component定義と、画面上に配置するComponent Useは別の要素です。共有する内容は定義側に置き、利用箇所固有の入力はProps Bindingで渡します。

## Componentの基本構造

```text
Component
├─ Props       外部から受け取る値
├─ Slots       差し込み領域の定義（必要な場合に追加）
├─ Store       ComponentのStateとEffect
├─ Retention   表示部分に属する宣言や振る舞い
└─ Elements    描画される内容
```

Retentionは画面に描画されない宣言・定義・処理の領域です。表示前に値を計算し、Elementsから変数を `$var` で参照します。描画中のStateは読み取り用で、クリックによる更新はイベントActionに分けます。[Retentionの仕様](/reference/elements/retention/)で評価順とスコープを説明しています。

## 値と表示内容を受け渡す

Propsは値を受け取る契約、Slotは表示内容を受け取る契約です。Slotには「定義」「表示位置」「呼出側の内容」があり、それぞれSlot、Slot Use、Slot Contentという別の要素で扱います。手順付きの例は[Componentを再利用する](/guides/reuse-components/)を参照してください。

差し込み内容のStateは呼出側、PropsはSlotから渡された値です。PanelのローカルStateやPropsがすべて自動で見えるという仕組みではありません。現行実装ではSlotの深い配置にも制約があります。[Slot Useの仕様](/reference/elements/slot-use/)で境界を確認してください。

このページの説明は概念の入口です。初期構造、設定、Stateの寿命、Root Partialなどは[Componentの個別仕様](/reference/elements/component/)を参照してください。Stateと表示要素は[State](/reference/elements/state/)、[Tag](/reference/elements/tag/)、[Text](/reference/elements/text/)で調べられます。
