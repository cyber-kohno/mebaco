---
title: UIを組み立てる
description: ComponentのElementsにTagとTextを配置し、固定の文字とStateに応じた表示を作ります。
---

画面の入口はComponentの `Elements` です。ここにTagやTextを追加して、表示する内容と親子関係を作ります。最初から一連の操作を試す場合は、[Counterチュートリアル](/start/first-project/)を参照してください。

## TagとTextの役割

TagはHTMLの要素に対応し、`Tag name` で `div`、`p`、`button` などを選びます。Textは画面に表示する文字です。ボタンを作るには、buttonのTagと、その子のTextを組み合わせます。

```text
Component / Elements
├─ Tag: p
│  └─ Text: 説明文
└─ Tag: button
   └─ Text: 実行
```

親にしたい要素を右クリックし、`Add view → Tag` または `Add view → Text content` を選びます。Elementsを右クリックすれば画面直下、Tagを右クリックすればそのTagの中に追加します。Tag nameによっては子を持てないため、使える追加操作は対象によって変わります。

## 固定の文字を表示する

1. 親のTagを右クリックし、`Add view → Text content` を選びます。
2. `Create Text` の `Text` 欄を固定値モードのままにして、表示したい文字を入力します。
3. 「作成（Create）」を押します。

固定値には引用符を付けません。例えば `実行` と入力すれば、そのまま「実行」と表示されます。

## Stateに応じて文字を変える

Textの式切替ボタン（`Use formula`）で式モードに切り替え、式の表示欄をクリックしてエディターを開きます。number型のState `count` を表示する例は次のとおりです。

```ts
String($state.count)
```

Textの式は文字列を返す必要があります。数値を表示するときは `String(...)` を使います。式エディターを閉じた後、要素ダイアログの「作成（Create）」または「更新（Update）」で確定してください。

Stateの作り方と更新方法は[StateとAction](/guides/state-and-actions/)で説明します。

## 属性とイベントを設定する

Tagの作成・変更ダイアログにある `Attribute` タブで設定します。

- `Add Attribute` — 属性名と値を指定する
- `Add Event` — `click` などのイベント名とActionを指定する

表示する文字はText、見た目は `Style` タブ、クリック時の処理はイベントのActionというように、設定場所を分けて考えると整理しやすくなります。

## 配置を確認する

作成後はツリーの親子関係を確認し、Appを選択して `T → run → Enter` でPreviewを開きます。追加した内容が見えない場合は、実行するAppのEntryがそのComponentを参照しているかも確認してください。

## 関連項目

- [Tagの仕様](/reference/elements/tag/) — 対応タグ、属性、イベントと制約
- [Textの仕様](/reference/elements/text/) — 入力モード、型、実行時の表示
- [Projectの構造](/concepts/project-model/) — 定義したComponentと実行の入口
- [Componentを再利用する](/guides/reuse-components/) — 別のComponentを画面に組み込む
- [Styleを適用する](/guides/style-app/) — 見た目の設定
- [要素一覧と仕様台帳](/reference/elements/) — Viewと制御要素の一覧
