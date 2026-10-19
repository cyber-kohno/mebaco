---
title: Elements
description: Componentの表示内容・Directive・Blockを配置する領域。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`elements`はComponentの表示内容を保持する領域です。Tag／TextなどのContent、表示Directive、Blockを追加して画面を組み立てます。

## 配置場所と操作

Component作成時に初期配置されます。コンテキストメニューからContent、Directive、Blockの各追加メニューを利用します。

## 子要素

利用可能な子はTag、Text、Conditional、Loop、Switch、Blockなどです。Element Registryの親子制約とContent Placementに従います。

## 設定項目

Elements自体に設定値はありません。表示内容や属性、イベントは子Elementで編集します。

## 参照とスコープ

子Elementの式はComponentのState／Props／Retentionおよび該当ローカルスコープを参照します。Componentから外へ出る値の寿命はRetention設定と合わせて考えます。

## 実行時の動作

RuntimeのElement Dispatcherが各子Elementを対応する表示・制御Rendererへ振り分けます。Elementsフォルダー自身はDOMを描画しません。

## 最小例

ElementsにTagを追加し、その子にTextを置いて固定文言を表示します。数式や表示条件は必要に応じてExpression／Directiveを使います。

## 制約と注意点

- すべてのElementがすべての親の下に置けるわけではありません。
- Void TagやContent Hostなど、HTML要素別の子配置制約があります。
- Component表示全体の保持値やStateはElementsの外側にある対応コンテナで設定します。

## 関連項目

- [Component](/reference/elements/component/)、[Tag](/reference/elements/tag/)、[Text](/reference/elements/text/)
- [Conditional](/reference/elements/conditional/)、[Loop](/reference/elements/loop/)、[ComponentとRetention](/concepts/component/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="elements" />
