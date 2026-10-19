---
title: ResourceとStorage
description: 外部ファイル・SQLiteとアプリ内の永続データを安全に使い分けます。
---

ResourceとStorageはどちらもデータを扱いますが、用途と権限境界が異なります。

| | Resource | Storage |
| --- | --- | --- |
| 扱うもの | 利用者のファイル、ディレクトリ、SQLite | Mebacoが管理するKey Valueデータ |
| 保存場所 | Configurationや配布Clientが結び付ける外部パス | アプリのApplication Data内 |
| 利用準備 | Resource定義 + App Import + パスBinding | Key Value定義 + App Import |
| アクセス | Read / Read-Writeなどの権限付きAPI | 非同期のget / set |
| 主なNamespace | `$resource.<id>` | `$storage.keyValue.<id>` |

要素ごとの設定は[Resources](/reference/elements/resources/)、[Directory Resource](/reference/elements/directory-resource/)、[SQLite Resource](/reference/elements/sqlite-resource/)、[Storage](/reference/elements/storage/)を参照してください。

## Resourceを使う

### 1. Resourceを定義する

ProjectのResourcesでResourceを追加します。

- フォルダを起点に複数のファイルを扱うならDirectory Resource
- 単一テキストファイルならText Resource
- SQLiteファイルならSQLite Resource

最初はRead権限から始め、書込み・削除など必要な権限だけを個別に許可します。Directory Resourceの配下でText/SQLiteを使う場合は、派生機能を有効にし、独自のAccessとパスPatternを設定してください。

### 2. AppへImportする

AppのImportにあるResource Importsを編集し、使うResourceを選びます。Resource定義だけではAppの式から参照できません。Import後、IDは `$resource.<id>` として見えます。

### 3. 実行時パスをBindingする

ResourceはProjectに絶対パスを固定せず、実行時Configurationから対象パスを受け取ります。Studio内で使うResource Bindingに絶対パスを設定します。Clientへ配布した後は、そのPackageの起動設定で利用者環境のパスをBindingします。

現在のStudio Runtimeは、Project内で最初に並ぶDebug ConfigurationのResource Bindingを使います。複数Configurationを作った場合に選択中のConfigurationが使われるとは限らないため、利用するConfigurationの順序と実際のPreview結果を確認してください。

異なるPCでパスが同じとは限りません。Projectに個人の絶対パスを埋め込むのではなく、開発機ごとのDebug設定、または配布後のClient設定として扱います。

### 4. APIを呼び出す

Resourceの物理I/Oは非同期です。ActionやAsync Functionから呼び出し、失敗時のエラーを扱います。

```ts
const files = await $resource.workspace.list()
const text = await $resource.settingsFile.read()
await $resource.settingsFile.write(text)
```

最後の書込み例はText ResourceがRead-Writeの場合だけ実行できます。

Directory Resourceは`list`、`exists`、`glob`のほか、許可設定に応じて作成・移動・コピー・削除を提供します。Text ResourceはUTF-8の`read` / `write`、SQLite Resourceは`query`、Read-Write時の`execute` / `transaction`を提供します。

相対パスを使い、`..`や絶対パスは指定しません。SQLite値はパラメーターで渡し、SQL文字列への値連結を避けてください。

## Storageを使う

### 1. Key Valueを定義する

ProjectのStorageからKey Valueを追加します。Id、型、Null許容、Initialを設定します。Initialは固定値または型の既定値で、式ではありません。保存できる型は永続化可能な型に限られ、Function Signature型は使えません。

### 2. AppへImportする

AppのStorage ImportsからKey Valueを選びます。Importされたものだけが `$storage.keyValue.<id>` として利用できます。

### 3. 値を読む・保存する

`get()`と`set(value)`はいずれも非同期です。初回getでは保存データがまだなければInitialが保存されて返り、以降は保存値が使われます。

```ts
const settings = await $storage.keyValue.preferences.get()
await $storage.keyValue.preferences.set({ theme: 'dark' })
```

StorageはStateではありません。set後の値はStateのように自動追跡・再描画されないため、必要な画面表示はAppのStateと明示的に同期してください。

## 保存スコープとデータ移行

Studioの開発実行ではProject単位の開発用スコープ、配布ClientではPackage単位のスコープが使われます。開発中に保存したデータが、配布先のデータへ自動コピーされるわけではありません。Key Valueの内部IDを維持するか変更するかも、既存ユーザーデータを引き継ぐかどうかに関係します。

StorageはProjectファイルやBundleの中身ではなく、Studio/ClientのApplication Dataに置かれます。バックアップ、消去、型変更時の移行手順を製品として案内する場合は、配布版の保存先と移行仕様を別途確認してください。

## 安全に使うための確認

- まずReadで実装し、必要になった操作だけRead-Writeへ変更する。
- Directoryのルートと派生ResourceのPatternを狭くする。
- ResourceのパスBindingが開発機・配布先の双方で設定されていることを確認する。
- Storageへ保存する値をJSON互換に保つ。Function、BigInt、Symbol、undefined、循環参照、NaN/Infinityは保存できない。
- StorageのsetやResource操作は失敗し得るため、Promise rejectionを適切に処理する。
- SQLiteのSQL値はパラメーターに分離し、更新はTransaction APIを使う。

## 関連項目

- [Resource Imports](/reference/elements/resource-imports/)
- [Text Resource](/reference/elements/text-resource/)
- [SQLite Resource](/reference/elements/sqlite-resource/)
- [Storage Imports](/reference/elements/storage-imports/)
- [Key Value](/reference/elements/key-value/)
- [デバッグする](/guides/debug/)
- [アプリを配布する](/guides/distribute/)
