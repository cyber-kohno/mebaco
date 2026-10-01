---
title: Components
description: 再利用可能なComponent定義をまとめる一覧。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`components`は再利用可能なComponent定義を管理するコンテナです。個々のComponentがProps、表示構造、StateやRetentionなどを持ちます。

## 配置場所と操作

Declares配下に配置されます。Add componentからComponentを作成します。App内・Common・ローカル領域では利用可能範囲が異なります。

## 子要素

0個以上の`component`を持ちます。

## 設定項目

Components自身には設定値がありません。Component IdやRoot PartialはComponent定義で指定します。

## 参照とスコープ

Component Useが参照できる候補は、所属App、Common、ローカル宣言などの定義スコープに従います。Component定義内のComponent Useも同じ境界と循環参照制約を受けます。

## 実行時の動作

コンテナはRuntimeで描画されません。RuntimeはComponent Useから対象Component定義を解決して描画します。

## 最小例

Componentsから`Panel`を作成し、Elements配下にTagを構成します。別ComponentのElementsにComponent Useを置き、Panelを選択します。

## 制約と注意点

- 同じ一覧のComponent Idは重複できません。
- Component定義の削除は参照が残っている場合に制限されます。
- 共通化範囲に迷うときはまずApp内に作り、複数Appで共有する場合にCommonへ置く設計を検討します。

## 関連項目

- [Component](/reference/elements/component/)、[Component Use](/reference/elements/component-use/)
- [Common](/reference/elements/common/)、[ComponentとRetention](/concepts/component/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="components" />
