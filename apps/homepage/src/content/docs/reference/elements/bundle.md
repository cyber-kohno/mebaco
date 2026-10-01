---
title: Bundle
description: Clientへ配布するLauncher、App、Resourceの構成とBuild Revision。
---

import ElementReferenceEvidence from '../../../../components/ElementReferenceEvidence.astro';

## 概要

`bundle`はMebaco Application Package（`.mbcapp`）の配布構成です。選択したLauncherから必要なApp・Common・Resourceを解析し、Build／Releaseします。

## 配置場所と操作

Release > Bundlesから作成・編集・削除します。Modify画面にはTargetsとRevisionがあります。TargetsでIdとLaunchersを設定し、RevisionはBuild結果を確認します。

## 子要素

Bundleは子要素を持ちません。対象Launcher、App、Resourceなどは識別子でProject内の定義を参照します。

## 設定項目

| 項目 | 内容 |
| --- | --- |
| Id | 同一Bundles内で一意な識別子。1〜32文字のIdentifier |
| Launchers | Packageに含めるLauncher。少なくとも1つ必要 |
| Generation | Buildで作られたRevision番号。読み取り専用 |
| Content hash | Build内容のハッシュ。読み取り専用 |
| Built at | Revisionを生成した日時。読み取り専用 |

## 参照とスコープ

Launcherが指定するAppを起点に、Transition先のAppも含まれます。AppのResource Importsから参照Resourceを集めます。Storage Importsは参照先が存在することを検証します。Componentや式の検証対象は含まれるAppとCommonです。

## 実行時の動作

`build <id>`はBundle依存を解析し、参照・Binding・式を検証します。内容が前回Buildから変わったときGenerationを1増やし、Content hashとBuilt atを更新します。同一内容ならRevisionは増えません。

`release <id>`は現在の内容を再検証し、RevisionのContent hashと一致する場合に`.mbcapp`を生成します。PackageはManifestとModuleデータを持ち、Launcher、到達可能なApp、Resources、Resourcesを除いたCommonを含みます。

## 最小例

1. Bundle `desktop`を作成し、`Main` Launcherを選びます。
2. Terminalで`build desktop`を実行し、エラーを解消します。
3. Projectを保存してdirty状態をなくし、`release desktop`で`.mbcapp`を保存します。
4. ClientでInstall後、LauncherとResource Pathを設定して起動します。

## 制約と注意点

- Launcherが0件、参照先App／Resourceの欠落、不正なTransitionやComponent参照、式検証エラーはBuildを止めます。
- `release`前にProjectが保存済みで、Build後に変更されていない必要があります。変更した場合は再Buildし、保存します。
- PackageはProject全体のコピーではなく、選択Launcherの依存範囲です。関係しないAppや未参照Resourceを含むとは限りません。
- Bundle RevisionはReleaseの手動入力値ではなくBuildから設定されます。
- Studio Debug Resource BindingはPackageに引き継がれず、Client側で個別に設定します。

## 関連項目

- [Release](/reference/elements/release/)、[Bundles](/reference/elements/bundles/)
- [ResourceとStorage](/guides/resources-storage/)、[アプリを配布する](/guides/distribute/)
- [保存形式とBundle](/reference/project-files/)

## 実装照合・バージョン

<ElementReferenceEvidence kind="bundle" />
