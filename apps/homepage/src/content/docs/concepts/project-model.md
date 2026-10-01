---
title: Projectの構造
description: ProjectからApp、Entry、Componentへ続く構造を説明します。
---

Mebacoではアプリの設計情報をProjectとしてまとめます。Projectには共通定義と複数のAppを含められます。AppのEntryは起点となるComponentを参照し、初期Propsを渡します。

```text
Project
├─ Common                 共通の定義
└─ Apps
   └─ App
      ├─ Imports                     利用する機能の設定
      ├─ Store                       AppのStateとEffect
      ├─ Declares / Components
      │  └─ Component                画面と振る舞いの定義
      └─ Entry → Componentを参照     起動時の画面を指定
```

Projectの編集状態はStudio上で管理し、保存操作でProjectファイルへ書き出します。App内にComponentを定義し、EntryからそのComponentを参照すると最初の画面になります。Entryの直接の候補は同じApp内の通常Componentです。

設定と制約は[App](/reference/elements/app/)、[Entry](/reference/elements/entry/)、[Component](/reference/elements/component/)の個別仕様を参照してください。ファイル形式の入口は[保存形式とBundle](/reference/project-files/)、その他の要素は[要素一覧](/reference/elements/)です。
