---
title: Transition
description: 実行時にImport済みの別Appへ引数付きで遷移する処理。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`transition`は現在のAppから別Appへ移動する処理要素です。遷移先Appと、そのAppのLaunch ArgumentsへのBindingを持ちます。

## 配置場所と操作

対応するAction／Procedureなど遷移要素を配置可能な場所で追加します。ModifyからAppとArgumentsを設定します。

## 子要素

子Elementはありません。App参照と引数Bindingを保持します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| App | 遷移先。所属AppのTransitionsでImport済みのAppから選択 |
| Arguments | 遷移先のLaunch Argumentsに渡すBinding |

## 参照とスコープ

遷移先候補と引数契約は、Transitionの所有元AppおよびそのTransitions Importから取得されます。Binding式は呼び出し元のFormula Contextで評価されます。

## 実行時の動作

実行時に遷移先がImport済みかを確認し、Bindingを解決後にTransition要求を出します。未設定・未Import・Bindingエラーの場合は遷移せずRuntime Errorを返します。

## 最小例

Settings AppをTransitionsへImportし、ボタンに結び付けたActionからSettingsを対象とするTransitionを実行します。

## 制約と注意点

- 対象AppをImportするだけでは遷移処理は実行されません。
- Appに必須Launch Argumentがある場合、適切なBindingを指定します。
- Bundle Buildでは遷移先Appとその依存が検証・収録対象になります。

## 関連項目

- [Transitions](/reference/elements/transitions/)、[Import](/reference/elements/imports/)
- [Action](/reference/elements/action/)、[Launch Argument](/reference/elements/launch-argument/)、[Bundle](/reference/elements/bundle/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="transition" />
