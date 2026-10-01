---
title: 最初のProject
description: State、Text、クリックActionを使ってCounterを作り、Previewで実行して保存します。
---

ボタンを押すたびに数値が1増える、小さなCounterを作ります。Projectの作成から、画面と処理の編集、Previewでの実行、ファイルの保存までをひと通り体験できます。

## このチュートリアルで作るもの

最初は `0` と `+1` ボタンを表示し、クリックすると `1`、`2`、`3` と増えるアプリです。外部ファイル、Storage、追加ライブラリは使いません。

| 要素 | 設定 | 役割 |
| --- | --- | --- |
| App | Id: `counter` | 実行するアプリ |
| Component | Id: `Main` | 最初に表示する画面 |
| State | Id: `count`、number、初期値 `0` | クリック回数を保持する |
| Text | 式: `String($state.count)` | 現在の数値を表示する |
| Tag | Tag name: `button` | クリックを受け取る |
| clickイベントのAction | `$state.count += 1;` | 数値を1増やす |

### 始める前に

[Mebaco Studioを起動](/start/install/)してください。この手順はデスクトップ版Studioで行います。Webブラウザーだけでの開発用起動は、ネイティブのファイル保存・読込を確認する対象に含めません。

以下では日本語の共通ボタン名に英語名を併記します。要素の追加メニューや設定名は、画面に表示される `Add app`、`Value Type` などの表記を使います。

ツリーの項目を右クリックすると、その項目で使える操作が表示されます。子が見えない場合は、項目左側の開閉アイコンで展開してください。本文の `Main / Store / States` は、Mainの下にあるStore、その下にあるStatesを表します。

## 1. ProjectとAppを作る

1. 「開発」画面の「新規プロジェクト（New Project）」を押します。
2. ツリーの `Project / Apps` を右クリックし、`Add app` を選びます。
3. `Create App` の `Id` に `counter` と入力し、「作成（Create）」を押します。
4. 「Main Componentを自動生成しますか？」という確認で「はい（Yes）」を選びます。

これでApp内の `Declares / Components` に `Main` が作られ、`Entry` がMainを参照するようになります。今回はEntryを手動設定する必要はありません。

```text
Project
└─ Apps
   └─ App: counter
      ├─ Store                 ← App側のStore（今回は使わない）
      ├─ Declares
      │  └─ Components
      │     └─ Component: Main
      │        ├─ Props
      │        ├─ Store
      │        │  ├─ States    ← ここにcountを作る
      │        │  └─ Effects
      │        ├─ Retention
      │        └─ Elements    ← ここに画面を作る
      └─ Entry → Mainを参照
```

図は、このチュートリアルに関係する部分だけを抜粋しています。MainはEntryの子要素ではなく、Componentsに置いた定義をEntryから参照します。

確認: `counter` の下にMainがあり、Entryの参照先がMainになっていれば次へ進めます。

## 2. 数値のStateを作る

1. `counter / Declares / Components / Main / Store / States` を右クリックします。
2. `Add state` を選びます。
3. `Create State` で次を設定します。

| 項目 | 入力・選択 |
| --- | --- |
| Id | `count` |
| Value Type | `number` |
| Literal Union | オフのまま |
| Array Depth | `0` のまま |
| Initial | `Set Value` を選び、固定値として `0` を入力 |

4. 「作成（Create）」を押します。

`Initial` は `Value Type` を選んでから設定してください。型を変更すると初期値の設定がリセットされます。今回は式モードに切り替えず、数値の入力欄に `0` を入れます。

:::note[どちらのStoreに置く？]
AppとMainの両方にStoreがあります。今回は画面自身が持つ値なので、MainのStoreを使います。App側のStatesに作らないよう、ツリーの親を確認してください。
:::

確認: MainのStatesの下に、number型の `count` が1つあれば準備完了です。

## 3. 現在の値を画面に表示する

まず、数値を表示する段落を作ります。

1. `Main / Elements` を右クリックし、`Add view → Tag` を選びます。
2. `Create Tag` の `Info` タブで、`Tag name` に `p` を選びます。他の設定は変更せず、「作成（Create）」を押します。
3. 作った `p` のTagを右クリックし、`Add view → Text content` を選びます。
4. `Create Text` の `Text` 欄にある式切替ボタン（`Use formula`）を押します。
5. 式の表示欄をクリックしてエディターを開き、次の式を入力します。

```ts
String($state.count)
```

6. 小さな式エディターの閉じるボタンを押し、`Create Text` に戻って「作成（Create）」を押します。

`$state.count` は現在のStateを読む記述です。Textの式は文字列を返すので、number型の値を `String(...)` で文字列に変換します。式全体を引用符で囲んだり、`return` を付けたりする必要はありません。

:::tip[固定値と式の違い]
固定値モードに `String($state.count)` と入力すると、その文字がそのまま表示されます。Stateに応じて表示を変えるときは、式モードに切り替えてから入力します。
:::

確認: Elementsの下に `p` があり、その子に式のTextがあれば正しい配置です。

## 4. ボタンとクリック処理を作る

### ボタンのTagとActionを設定する

1. `Main / Elements` を右クリックし、`Add view → Tag` を選びます。今回は `p` の子ではなく、Elementsの直下に追加します。
2. `Info` タブの `Tag name` を `button` にします。
3. `Attribute` タブを開き、`Add Event` を押します。
4. 追加されたevent行の名前に `click` を入力、または候補から選択します。`onclick` ではありません。
5. `prevent default` と `stop propagation` はオフのままにします。
6. event行の `TypeScript Action` エディターに次のコードを入力します。

```ts
$state.count += 1;
```

7. 「作成（Create）」を押してTagを確定します。

Actionはイベントが起きたときに実行する処理です。このコードは「countの現在値に1を足して書き戻す」という意味です。ボタンの子にAction要素を追加するのではなく、Tagのイベント欄にコードを書きます。

### ボタンにラベルを付ける

1. 作った `button` のTagを右クリックし、`Add view → Text content` を選びます。
2. `Text` を固定値モードのままにして、`+1` と入力します。引用符は付けません。
3. 「作成（Create）」を押します。

完成したMainの関係部分は次のようになります。

```text
Main
├─ Store
│  └─ States
│     └─ State: count（number、初期値0）
└─ Elements
   ├─ Tag: p
   │  └─ Text: 式 String($state.count)
   └─ Tag: button（click → $state.count += 1;）
      └─ Text: 固定値 +1
```

設定を直すときは、対象を右クリックして `Modify` を選びます。編集後は「更新（Update）」を押して確定してください。

## 5. Previewで動かす

1. 要素編集ダイアログと右クリックメニューを閉じます。
2. ツリーでAppの `counter` をクリックして選択します。
3. 入力欄ではなくツリーを操作している状態で、修飾キーなしの `T` キーを押します。Command Consoleが開きます。
4. `run` と入力し、Enterを押します。
5. Previewに `0` と `+1` ボタンが表示されることを確認します。
6. ボタンを3回押し、数値が `1 → 2 → 3` と変わることを確認します。

この例には起動引数を定義していないため、`run` からそのままPreviewが開きます。`run` は選択しているAppを実行するコマンドです。ProjectやAppsではなく、`counter` を選んでください。

```text
click → Actionがcountを書き換える → Textの式が新しい値を表示する
```

確認が終わったら、Preview右上の閉じるボタン（×）で編集画面に戻ります。

## 6. 保存して開き直す

1. Previewと編集ダイアログを閉じた状態で、画面上部の「保存（Save）」を押すか、`Ctrl + S` を押します。
2. 初回は保存先を選ぶダイアログが開きます。任意のフォルダーに `counter.mbc` として保存します。
3. 保存が完了したら、画面上部の「閉じる（Close）」でProjectを閉じます。
4. 開発ホームの「プロジェクトを開く（Open Project）」から `counter.mbc` を選びます。
5. `counter` を選び、もう一度 `T → run → Enter` で実行します。

ツリーとコードが復元され、Previewの最初の表示が `0` なら完了です。

:::note[保存されるのはアプリの定義]
この例の保存対象は、ツリー、Stateの初期値、Textの式、イベントのコードなどです。Previewで増やしたクリック回数はProjectの初期値に書き戻されません。Previewを閉じて新しく実行した場合も `0` から始まります。実行をまたいで値を残す機能は[ResourceとStorage](/guides/resources-storage/)で扱います。
:::

変更がないときは保存ボタンが無効になります。これは未保存の変更がない状態です。`.mbc` はStudioで編集するProjectファイルで、配布用Bundleとは別のものです。

## うまくいかないとき

| 状況 | 確認すること |
| --- | --- |
| Mainがない、Entryの参照先が空 | App作成後の自動生成で「はい」を選んだか。Mainを手動作成する場合はEntryのComponentも指定する。 |
| countが見つからない、式にエラーが出る | MainのStoreに `count` を作ったか。Idの大文字・小文字、number型、式の綴りを確認する。 |
| 式の文字がそのまま表示される | Textを式モードに切り替えたか。固定値の入力欄ではなく式エディターに入力する。 |
| ボタンが空、または表示されない | buttonの子に固定値 `+1` のTextがあるか。buttonとpがMainのElementsにあるか。 |
| クリックしても増えない | buttonのAttributeタブに `click` のeventがあるか。コードと、作成・更新の確定を確認する。 |
| TでConsoleが開かない | 入力欄やコードエディターから離れ、ダイアログ・Preview・メニューを閉じてツリーをクリックする。 |
| runが候補にない | ProjectやAppsではなく、Appの `counter` を選び直す。 |
| 保存できない | Previewを閉じ、デスクトップ版Studioで操作しているか、保存先に書込権限があるかを確認する。エラーがあれば内容を確認する。 |

詳しくは[トラブルシューティング](/troubleshooting/)へ進んでください。

## 次に学ぶこと

- 設定を詳しく調べる: [App](/reference/elements/app/) / [Entry](/reference/elements/entry/) / [Component](/reference/elements/component/) / [State](/reference/elements/state/) / [Tag](/reference/elements/tag/) / [Text](/reference/elements/text/)
- [UIを組み立てる](/guides/build-ui/) — TagとTextの配置、固定値と式の使い分け
- [StateとAction](/guides/state-and-actions/) — 表示を読む式と、値を変更する処理の関係
- [Projectの構造](/concepts/project-model/) — App、Entry、Componentの役割
- [アプリを配布する](/guides/distribute/) — Projectの保存と配布用Bundleの違い
