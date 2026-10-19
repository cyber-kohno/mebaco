---
title: Catch
description: Promiseが拒否されたときに実行する任意の処理枝。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`promise-catch` は親Promiseが拒否されたときのエラー処理枝です。Catchがなければ拒否は処理失敗として報告されます。

## 配置場所と操作

PromiseのメニューからUse catchで追加し、Remove catchで取り除きます。Catchは親Promiseごとに任意で1つです。

## 子要素

宣言、Action、Promise、Transition、Conditional/Switch、Block等を持てます。Returnは追加できません。

## 設定項目

Error Idは必須のJavaScript識別子で、長さは1〜32文字です。

## 参照とスコープ

Error IdはCatch枝のエラー値を参照します。これは任意のJavaScript例外を受けるため、通常の宣言型を指定する欄はありません。

## 実行時の動作

親Promiseのreject時にError Idを束縛し、Catch内の処理を実行します。処理が成功すればCatch枝として完了し、枝内処理が失敗すればそのエラーが報告されます。

## 最小例

Error Idを `error` とし、Catch内のActionでエラーの概要を記録するか、画面用Stateを更新します。

## 制約と注意点

- Catchは任意ですが、欠落させるとrejectが失敗として報告されます。
- Error IdはCatch枝のローカル束縛です。
- Catch内からFunction Returnは追加できません。
- Catch処理でエラーを握りつぶす場合も、失敗状態を適切にStateやログへ伝える設計を検討してください。

## 関連項目

- [Promise](/reference/elements/promise/)
- [Then](/reference/elements/promise-then/)
- [Action](/reference/elements/action/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="promise-catch" />
