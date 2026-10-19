---
title: Store
description: AppまたはComponentのStateとEffectをまとめる管理要素。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`store`はStateとEffectの管理領域です。AppとComponentのそれぞれに作られ、配置先が状態の所有者と寿命を決めます。

## 配置場所と操作

AppまたはComponent作成時に初期配置されます。Store自身に設定や追加メニューはありません。

## 子要素

StatesとEffectsを持ちます。StatesはState定義、Effectsは依存変化に応じた副作用定義をまとめます。

## 設定項目

Store自体の編集可能な値はありません。State／Effectの詳細は個別要素で設定します。

## 参照とスコープ

App StoreのStateとComponent StoreのStateは同一ではありません。Component StateはそのComponentのRuntime instanceやRetention構成に結び付きます。参照できる状態は所属先とStateScopeに従います。

## 実行時の動作

Storeは単体実行されません。App／Component RuntimeがStatesを初期化し、Effectsを動かします。

## 最小例

App StoreのStatesに`count`を作り、Component Storeに`isOpen`を作ります。画面全体の共有値とComponent内部の値を用途に応じて分けます。

## 制約と注意点

- Storeの見た目上の近さは、すべての式欄からの可視性を意味しません。
- App StateとComponent Stateの寿命・保持は別途確認します。
- Persistentなデータが必要な場合、StateではなくStorageを検討します。

## 関連項目

- [States](/reference/elements/states/)、[State](/reference/elements/state/)
- [Effects](/reference/elements/effects/)、[Effect](/reference/elements/effect/)
- [ComponentとRetention](/concepts/component/)、[Storage](/reference/elements/storage/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="store" />
