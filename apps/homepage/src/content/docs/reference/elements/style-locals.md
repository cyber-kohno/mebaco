---
title: Locals
description: Style内の読取専用VariableとKeyframesをまとめるコンテナ。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`style-locals` はStyle固有の補助VariableとKeyframesをまとめる任意のコンテナです。

## 配置場所と操作

StyleのメニューからUse localsを選びます。Add variableまたはAdd keyframesで子を追加します。削除時は式からの参照があるVariable／Keyframesを確認します。

## 子要素

Style内でVariableとStyle Keyframesを保持します。

## 設定項目

コンテナ自身に設定項目はありません。Variableの型とSource、Keyframesの名前とFramesを各子要素に設定します。

## 参照とスコープ

Style式からLocals内Variableを `$var.<id>` で参照します。Variableはmutableを許可しない定義です。Variableの式から見える前方宣言はツリー順で決まります。

## 実行時の動作

Style解決時にLocals Variableを順に評価してから、そのStyleのPropertiesやAnimationを解決します。評価エラーがあれば該当Styleの宣言解決が失敗します。KeyframesはStyle Animationから名前付きで参照します。

## 最小例

Variable `space` に `12` を設定し、Styleのpadding式から `$var.space + 'px'` を参照します。

## 制約と注意点

- LocalsはStyle単位であり、他のStyleのVariableは直接参照できません。
- Variableを並べ替えると宣言順と参照可能範囲が変わります。
- Keyframes ID変更・削除はStyle Animationの参照に影響します。
- Containerを削除すると内部Variable／Keyframesも失われます。参照がある場合は確認してから削除してください。

## 関連項目

- [Style](/reference/elements/style/)
- [Variable](/reference/elements/variable/)
- [Style Keyframes](/reference/elements/style-keyframes/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="style-locals" />
