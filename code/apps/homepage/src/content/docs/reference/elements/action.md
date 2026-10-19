---
title: Action
description: イベントやProcedure、Retention内で実行する処理文。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Action（kind: `action`）は、値を返す式ではなく、処理を記述するコード欄です。イベントに応答してStateを更新するほか、Function ProcedureやRetentionなどで実行されます。

## 配置場所と操作

Tagのイベント設定、Retention、Function Procedureなど、Actionを置ける位置から追加します。既存Actionは右クリックの `Modify` / `Delete` で編集します。Retentionでは `Add statement → Action` を選びます。

## 子要素

子要素はありません。処理コードはAction欄に入力します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Comment | 任意のコメント。最大64文字 |
| Action | TypeScriptのコード。最大8,000文字 |

## 参照とスコープ

Actionのコードは置き場所に応じたState、Props、Variable、Functionなどの参照を使います。イベントActionでは `$event` や、利用可能な場合に `$system`、`$resource`、`$storage`、`$transition` を利用します。どの名前が補完されるかは式エディターで確認してください。

## 実行時の動作

TagイベントのActionは非同期処理として実行され、Stateの書き込みを許可する文脈で動きます。Function ProcedureではFunctionの同期・非同期設定に従います。Retention内のActionは表示準備の処理なので同期実行され、Stateは読み取り専用です。

処理失敗はエラーとして報告されます。イベント途中でStateを更新した後にActionが失敗しても、そのState更新全体を自動で巻き戻す契約ではありません。

## 最小例

buttonのclickイベントにActionを設定し、number型のState `count` を増やします。

```ts
$state.count += 1;
```

## 制約と注意点

- 表示値を作る欄には式、複数の処理や更新にはActionを使います。
- `await` が使えるかは配置先とFunctionのAsync設定によります。どのActionでも使えるとは限りません。
- Functionを返す場合は、Action内のreturnではなくProcedureのFunction Return要素を使用します。
- Retention内のActionは描画の再評価で繰り返し実行される可能性があり、クリック時に一度だけ行いたい処理には適しません。
- 無効化されたActionはRuntimeでスキップされます。

## 関連項目

- [State](/reference/elements/state/)
- [Function](/reference/elements/function/)
- [Retention](/reference/elements/retention/)
- [Effect](/reference/elements/effect/)
- [式・コード](/reference/expressions/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="action" />
