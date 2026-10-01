---
title: アプリを配布する
description: Bundleを作成してClientへインストールし、アプリを起動します。
---

Bundleは配布対象のLauncherと、その起動に必要なApp・Common・Resourceをまとめた`.mbcapp`です。Bundleを定義し、Buildで検証・Revision化してからReleaseし、Client側でインストールと起動設定を行います。

## 1. Launcherを準備する

Projectに配布したいAppとLauncherを用意します。Launcherの対象App、Launch ArgumentsとBindingを確認します。AppからTransitionで遷移する他のAppやImport ResourceもBundleの依存関係として解決されます。

## 2. Bundleを作成する

ProjectのRelease > BundlesからAdd Bundleを選び、重複しない1〜32文字のIdを付けます。Launchersに少なくとも1つ、含めたいLauncherを選択します。選択LauncherがないBundleはBuildできません。

Bundleの範囲は選択Launcherから到達するAppとTransition先、Appが参照するResourceです。共通Moduleも含まれますが、Common配下のResourcesフォルダーは別途必要なResourceだけが対象になります。無関係なAppは含まれません。

## 3. BuildしてRevisionを作る

WorkspaceのTerminalでBundle Idを指定してBuildします。

```text
build desktop
```

BuildはLauncher・App・Transition・Component参照、Resource/Storage Importと式検証などを確認します。エラーがあれば表示されたElementや参照を直して再実行してください。成功するとGeneration、Content hash、Built atがRevision欄に記録されます。同じ内容ならGenerationは増えません。

## 4. 保存してReleaseする

Build後にProjectを保存し、未保存変更がない状態でTerminalからReleaseします。

```text
release desktop
```

保存先を選ぶと`.mbcapp`が出力されます。Build後にBundleの内容が変わっていたり、Projectが未保存だったりするとReleaseできません。その場合はBuildし直し、保存してからもう一度Releaseします。

## 5. Clientへインストールする

ClientのPackage画面でInstallから`.mbcapp`を選びます。インストール済みPackageを選択してLaunch Setupを開き、Launcherを選びます。Resourceが含まれる場合はResourceごとに利用者PC上のパスを割り当てます。ReadyになったらLaunchします。

Client側のResource PathとStudioのDebug Bindingは別設定です。配布先のパス・アクセス権・ファイルの存在を確認してください。StorageもPackage単位の実行データであり、開発環境の保存値が自動で配布されるわけではありません。

## 更新時

Projectを変更したら、Buildで新しいRevisionを作り、保存後に同じBundleをReleaseします。Clientでは対象Packageを選んでUpdateから新しい`.mbcapp`を指定します。更新・ダウングレードの確認ダイアログに表示されるRevisionを見て、意図した版か確かめてください。

## 関連リファレンス

- [Release](/reference/elements/release/)、[Bundles](/reference/elements/bundles/)、[Bundle](/reference/elements/bundle/)
- [ResourceとStorage](/guides/resources-storage/)、[保存形式とBundle](/reference/project-files/)
