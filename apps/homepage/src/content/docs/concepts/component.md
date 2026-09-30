---
title: ComponentとRetention
description: Component定義、利用箇所、Props、Slot、ローカルな宣言領域を説明します。
---

Componentは、UIと振る舞いをまとめて複数箇所から利用するための定義です。Component定義と、画面上に配置するComponent Useは別の要素です。共有する内容は定義側に置き、利用箇所固有の入力はProps Bindingで渡します。

## Componentの基本構造

```text
Component
├─ Props       外部から受け取る値とSlot
├─ Store       ComponentのStateとEffect
├─ Retention   表示部分に属する宣言や振る舞い
└─ Elements    描画される内容
```

Retentionは画面に描画されない宣言・定義の領域です。内側のTagや制御分岐もRetentionを持つ場合があり、どの式から名前が見えるかは要素種別と階層で変わります。詳細仕様では配置例、スコープ規則、Slotとの関係を明示します。

このページの説明は概念の入口です。正確な親子制約と設定項目は[要素一覧と仕様台帳](/reference/elements/)から個別仕様へ進む構成です。
