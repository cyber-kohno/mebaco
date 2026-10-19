---
title: Text
description: 固定文字列と式によるテキスト表示、入力上限、型検証、実行時のエラー表示。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

Text（kind: `text`）は、画面に文字を表示する要素です。固定の文字列、または文字列を返す式を設定します。HTMLタグやCSSを記述する要素ではありません。

## 配置場所と操作

ComponentのElements、子を持てるTag、表示用の条件分岐・繰り返し・Block、Slotの表示領域などに置きます。親を右クリックして `Add view → Text content`、変更はTextを右クリックして `Modify` を選びます。

`input`、`img`、`br` のTag内には追加できません。TagのRetention構造を使っている場合は、そのElementsに置きます。

## 子要素

Textに子要素はありません。文字を囲む段落やボタンは親のTagで設定します。

## 設定項目

| 表示名・モード | 既定値 | 内容・制約 |
| --- | --- | --- |
| Text / 固定値 | 空文字列 | そのまま表示する文字。最大200文字 |
| Text / 式 | 切替時は空 | 文字列を返すTypeScript式。最大4,000文字 |
| Use formula / Use literal value | 固定値モード | 入力モードを切り替える |

固定値には引用符を付けません。式は表示欄をクリックしてエディターを開き、入力後に閉じます。最後に要素ダイアログの作成・更新を確定してください。

モードを切り替えると元の入力値はクリアされます。必要な内容は切替前に控えてください。

## 参照とスコープ

式はTextを表示する場所のコンテキストで評価されます。例えばComponentの `$state` / `$props`、親のRetentionで用意した `$var`、繰り返しの変数などは、その場所で可視の場合に利用できます。

Textは描画中の評価です。Stateを変更するための場所ではありません。更新処理はTagのイベントActionなどに記述します。

## 実行時の動作

固定値はそのまま表示されます。式は参照したStateの依存関係を追跡し、値の変化に応じて再評価されます。

入力エディターの期待型はstringですが、Runtimeには次の表示処理もあります。これらを利用して型エラーを無視するのではなく、式を文字列型に合わせるのが基本です。

| 評価結果 | 現行Runtimeの表示 |
| --- | --- |
| 文字列 | その文字列 |
| `null` | 空表示 |
| `undefined` | `[Formula Undefined]` |
| その他の値 | `String(value)`による文字列化 |
| 式の評価失敗 | 角括弧に入れたエラー内容 |

文字はテキストとして表示されます。`<strong>Hello</strong>` を固定値に書いても、HTMLとして挿入されません。強調した見た目はTag・Style側で作ります。

## 最小例

固定のボタンラベル:

```text
Tag: button
└─ Text: 固定値 +1
```

number型のState countを表示する式:

```ts
String($state.count)
```

式に `return` は不要です。式全体を引用符で囲むと、計算するコードではなく固定の文字列になるため注意してください。

## 制約と注意点

- 固定値の入力欄にコードを書いても実行されません。動的な表示は式モードへ切り替えてください。
- Textの無効化は文字を表示しない操作です。親Tagまで自動で削除する操作ではありません。
- Text自体にはStyleやイベントの設定欄がありません。親Tagで設定します。
- 実行時のエラー文字は失敗の診断であり、意図した表示結果ではありません。式の検証とスコープを確認してください。

## 関連項目

- [Tag](/reference/elements/tag/)
- [State](/reference/elements/state/)
- [UIを組み立てる](/guides/build-ui/)
- [式とスコープ](/concepts/expressions-and-scope/)
- [最初のProject](/start/first-project/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="text" />
