---
title: Keyframes
description: Style Animationから参照するCSS Keyframes定義。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`style-keyframes` はAnimationの時間経過に沿って変化するCSSプロパティ値を定義します。StyleのLocals内に置き、StyleのAnimation欄から参照します。

## 配置場所と操作

Style LocalsのAdd keyframesで作成します。ModifyからIdとFramesを編集します。Keyframesは参照中に削除できません。

## 子要素

FrameとDeclarationはKeyframesエディター内のデータで、ツリー上の子要素ではありません。初期Frameは0%と100%です。

## 設定項目

Frameは0〜100の有限数のOffset SelectorとCSS Declarationを持ちます。プロパティ値はLiteralまたはFormulaです。

## 参照とスコープ

Style Animationから同一Style Locals内のKeyframesを参照します。FrameのFormulaは対象StyleのParameter、Locals、Tag適用Contextを使って解決されます。

## 実行時の動作

Style解決時にKeyframes定義をCSS相当のAnimationデータへ変換し、Animation Ruleに紐付けます。同じ出力内で重複するKeyframes名は一つにまとめられます。

## 最小例

0%で `opacity: 0`、100%で `opacity: 1` を設定し、StyleのAnimationsからKeyframesを選んでdurationを `250ms` にします。

## 制約と注意点

- Offsetは0〜100でなければなりません。
- SelectorのないFrameは無効です。
- KeyframesはStyle内に閉じた参照です。他StyleのKeyframesを直接共有する機能として説明しないでください。
- ブラウザーのCSS Animation対応状況や値の妥当性は、実行環境で確認してください。

## 関連項目

- [Style](/reference/elements/style/)
- [Locals](/reference/elements/style-locals/)
- [Styleを適用する](/guides/style-app/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="style-keyframes" />
