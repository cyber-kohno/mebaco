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
      ├─ Entry ────────── 起動時のComponentを指定
      ├─ Imports          利用するApp / Resource / Storage
      └─ Component        画面と振る舞いを構成
```

Projectの編集状態はStudio上で管理し、保存操作でProjectファイルへ書き出します。App、Entry、Import、Launcher、ファイル形式の詳細は[保存形式とBundle](/reference/project-files/)および[要素一覧](/reference/elements/)に記載します。
