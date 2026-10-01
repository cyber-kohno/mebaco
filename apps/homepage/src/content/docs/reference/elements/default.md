---
title: Default
description: SwitchでCaseが一致しないときに使う任意の最後の枝。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`default` は一致するCaseがない場合の枝です。表示SwitchとProcedure Switchの両方で利用できます。

## 配置場所と操作

親SwitchのUse defaultから追加します。既にDefaultがあれば追加できません。Defaultは無効化できます。

## 子要素

表示Switchでは任意のRetention、Procedure Switchでは処理要素を持ちます。

## 設定項目

設定項目や一致条件はありません。

## 参照とスコープ

Defaultは親Switchの式結果を参照する必要はありません。枝内の内容・処理は親の文脈で評価されます。

## 実行時の動作

Caseが一つも一致しないときに選択されます。Defaultがない場合は、表示Switchでは何も表示せず、Procedure Switchでは後続処理へ進みます。

## 最小例

未知の状態を扱う必要がある場合、Defaultに「未対応」表示または安全な既定処理を置きます。

## 制約と注意点

- Switchごとに1つまでです。
- Caseより後ろ、つまり最後の枝である必要があります。
- 分岐の無効化状態とフォールバックの関係は、初版公開前に配布ビルドで確認してください。

## 関連項目

- [Switch（表示）](/reference/elements/switch/)
- [Switch（Procedure）](/reference/elements/control-switch/)
- [Case](/reference/elements/case/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="default" />
