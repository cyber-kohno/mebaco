# Front Driven 現行システム解析・仕様書（第1版）

## 1. 文書の目的

この文書は、現行コードと同梱DBを静的解析し、Front Driven の現在の仕様を再構築向けに整理したものである。

- **確認済み**: コードまたはDB定義から直接確認できた事項
- **推定**: 複数の実装から合理的に推測できる事項
- **未確認**: サーバー側コード、実運用、画面操作などの確認が必要な事項

現時点ではフロントエンドリポジトリのみが対象であり、DB APIサーバー、デプロイ基盤、運用手順は含まれていない。

## 2. サービスの要約

Front Driven は、Reactアプリの構造と振る舞いを独自のツリーモデルとして編集し、そのモデルを同じフロントエンド上の実行エンジンで表示するローコードIDEである。

主要な価値は次の3点である。

1. プログラムをソースコードではなく構造木として編集できる。
2. UI、状態、処理、データ型、スタイル、公開設定を同じモデルで俯瞰できる。
3. 開発データをサービスに保存し、共有URLからプロジェクトまたはアプリを直接起動できる。

## 3. 技術構成（確認済み）

| 項目 | 現行構成 |
|---|---|
| UI | React 18、TypeScript 4.9、styled-components |
| 基盤 | Create React App / react-scripts 5 |
| ルーティング | react-router-dom 5、HashRouter |
| 状態管理 | Reduxライブラリではなく、Context + 単一Storeオブジェクト + 独自Dispatcher |
| エディタ | 独自ツリーエディタ、Monaco Editor |
| 永続化 | 外部DB APIへSQL文字列をPOST、SQLiteデータベース |
| 保存形式 | プロジェクト全体をJSON化し、gzip + Base64で `devmd.source` に格納 |
| 公開実行 | 保存済みツリーモデルを取得し、ブラウザ上のReaderが解釈してReact UIを生成 |
| 公開URL | `/#/project?v=...` と `/#/launch?v=...` |

コード規模は `src` 配下138ファイルで、ほぼすべての機能が単一フロントエンドに同居している。

## 4. 利用者と権限

### 4.1 想定利用者

- **未ログイン利用者**: Developの一部、JSON読込、テスト実行、共有アプリの起動
- **ログイン利用者**: ライブラリ管理、プロジェクトのアップロード・更新、アカウント設定
- **公開アプリ利用者**: 共有URLから特定ランチャーを実行

### 4.2 現行認証（確認済み）

- ユーザーは `user_tbl` に保存される。
- IDとパスワードによるログイン、アカウント作成、ユーザー情報変更がある。
- パスワードはクライアント側でSHA-256化している箇所があるが、認証判定自体はSQL検索で行われる。
- 共有URLのキーは Hashids + Base64 による連番の難読化であり、アクセス認可トークンではない。
- `permissions` ノードは初期モデルに存在するが、現行コードでは実効的な認可として完成していない可能性が高い。

## 5. 主要画面

### 5.1 起動・共通領域

- スプラッシュ表示
- ログイン、アカウント作成、ログアウト、アカウント編集
- 全体ヘッダー
- グローバルダイアログ

### 5.2 Library

- ログインユーザーが所有する開発モジュール一覧を取得
- モジュールの選択・読込
- 名前、概要、保存済みソースの管理

### 5.3 Develop

- **Json**: プロジェクトJSONの表示・編集・読込
- **Manage**: プロジェクト名と概要の設定、初回アップロード、既存データ更新
- **Struct**: プログラム構造木の中心的な編集画面
- **Test**: 現在のモデルをProjectFrameで実行・確認
- **Database**: テーブル・フィールド・レコード・CSV取込機能は実装されているが、現行タブからはコメントアウトされている

Struct画面には、ツリー、選択ノード編集、関連参照、ノードJSON、クリップボード、ブックマーク、検索、開閉状態・スクロール状態の保持がある。

### 5.4 Cache

- DB APIの接続先（Region）を複数登録
- 使用するRegionを選択
- Regionは `defName`, `domain`, `salt` を持ち、localStorageに保存
- Contents / Projects タブは未実装または無効

### 5.5 直接参照画面

- **Project**: 保存済みプロジェクトを取得し、プロジェクト全体を表示
- **Launch**: 開発モジュール内のランチャー番号を解決し、対象アプリを実行
- **Not Found**: 未定義ルートの表示

## 6. プロジェクトデータモデル

### 6.1 保存単位

```text
Project
├─ tables: テーブル定義とレコード
├─ rootData: 実行可能な構造木
└─ workData
   ├─ treeMemo: ノード開閉、選択、スクロール位置
   └─ bookmarks: ノードへのブックマーク
```

ツリーの全ノードは基本的に次の共通形式を持つ。

```ts
type WrapElement = {
  type: NodeType;
  data: any;
  disabled?: true;
}
```

この柔軟さが機能追加を容易にする一方、スキーマ検証、型安全な移行、破損データ検出を難しくしている。

### 6.2 初期ツリー

```text
project
├─ release
│  ├─ launchers
│  └─ permissions
├─ apps
└─ common
   └─ declares
      ├─ styles
      ├─ structs
      ├─ funcs
      └─ comps
```

各アプリは固有の宣言・状態・UI・処理を持ち、commonの宣言を再利用する構造と考えられる。

### 6.3 ノード機能分類

| 分類 | 代表ノード・機能 |
|---|---|
| 公開 | release, launchers, launcher, permissions |
| アプリ構造 | apps, app, common, entry, child |
| データ定義 | structs, struct, field, store, states, state, props |
| 再利用 | comps, compdef, compuse, funcs, func, styles, style |
| UI | tag, text, span, tabs, table, input, button, custom tag |
| イベント | trigger, effect, callback, invalidate |
| 処理 | execute, update, assign, fetch, then, catch, promise, native, log |
| 制御 | case, switch, bool, when, accept, iterate, continue, break |
| 配列 | add, delete, concat, effect/filter/sort相当 |
| 値参照 | state, cache, property, component/function arguments, formula |

データ型は `string`, `number`, `boolean`, `color`, `struct`, `function`, `any` と多次元配列を表現できる。

## 7. 実行エンジン

### 7.1 実行の流れ（確認済み）

1. URLの難読化キーから開発モジュール連番とランチャー番号を復元する。
2. `devmd.source` をDB APIから取得する。
3. Base64を復号しgzip展開する。
4. JSONをProjectモデルとして復元する。
5. ランチャーから対象アプリと引数を決定する。
6. AppReader / ReaderUtil が構造木を解釈し、React要素、状態、処理を生成する。

### 7.2 式と動的処理

- 数式・条件式等は `Function` / `new Function` で実行される。
- FetchノードはURL、HTTPメソッド、ヘッダー、body、then/catchをモデル化する。
- Nativeノードにより、独自モデル外の処理を埋め込める可能性がある。

これは表現力の中核である一方、信頼されないプロジェクトを実行する場合は任意コード実行、データ流出、XSS相当のリスク境界になる。

## 8. データベース仕様

### 8.1 サービス本体 `fd0.db`

#### `user_tbl`

| 列 | 用途 |
|---|---|
| seq | ユーザー連番、主キー |
| id | ログインID、一意 |
| password | パスワードハッシュと推定 |
| email | メールアドレス |
| ip_list | IP関連情報。現行利用は未確認 |

#### `devmd`

| 列 | 用途 |
|---|---|
| seq | 開発モジュール連番、主キー |
| owner | 所有ユーザーseq |
| name | プロジェクト名 |
| outline | 概要 |
| source | gzip + Base64化したProject JSON |

外部キー制約、更新日時、論理削除、バージョン、公開状態はDB定義上存在しない。

### 8.2 同梱アプリDB

- `work.db`: 案件ビューと考えられる `ankenviw`
- `task_manage_test.db`: タスク、メモ、状態管理用の3テーブル

これらはサービス本体ではなく、Front Drivenで作られた業務アプリのデータ例または実データのコピーと推定する。

## 9. 現行の主要ユースケース

### 9.1 新規開発

1. IDEを開く。
2. JSONまたは初期モデルを用意する。
3. ツリー上で型、状態、関数、コンポーネント、アプリ、UI、処理を編集する。
4. Testで動作を確認する。
5. ログイン後、名前と概要を指定してアップロードする。

### 9.2 継続開発

1. Libraryから所有プロジェクトを取得する。
2. モデルを編集し、Testで確認する。
3. 同じ `devmd` を更新する。

### 9.3 環境複製

1. RegionとしてDB APIのdomainとsaltを登録する。
2. 対象Regionを切り替える。
3. プロジェクトJSONまたは保存データを別Regionへ登録する。

操作の完全な自動化は未確認だが、プロジェクトが単一JSONで自己完結しているため、本番・テスト間の複製が容易になっている。

### 9.4 公開・利用

1. プロジェクト内にランチャーを定義する。
2. 開発モジュールseqとランチャー番号から共有URLを生成する。
3. 利用者がURLを開くと、最新の保存済みProject JSONが取得・実行される。

## 10. 再構築前に優先して扱うリスク

### Critical

1. **クライアントから任意SQLに近い文字列を送信する構成**  
   `/select` と `/update` へSQL本文を送っており、認証・認可がサーバーで強制されなければ全データが危険になる。
2. **SQLインジェクション**  
   ID、パスワード、メール、プロジェクト名、概要等をSQLへ文字列連結している。
3. **公開キーを認可として扱えない**  
   Hashidsは暗号化・署名ではなく、アクセス制御の代替にならない。
4. **動的コード実行**  
   `Function` と `new Function` を利用するため、編集者と閲覧者の信頼境界、sandbox、CSPが必須。

### High

1. Project JSONに明示的な `schemaVersion` がなく、安全なデータ移行が難しい。
2. `data: any` と破壊的なStore更新が広範囲で、型検査だけでは不整合を防げない。
3. プロジェクト全体を単一DB列へ上書きするため、競合、履歴、部分復旧、監査が弱い。
4. 開発画面と公開ランタイムが同一バンドルにあり、権限・性能・障害影響を分離しにくい。
5. エラー処理のない非同期処理や `assert` 依存があり、通信障害や不正データ時に画面全体が停止し得る。
6. 接続先domainとsaltをURL/localStorageから受け取り、任意のバックエンドへ接続できる。

### Medium

1. CRA、React Router v5など更新停止・旧世代の基盤が含まれる。
2. コメントの文字化けと多数のコメントアウト済み実装があり、保守判断を妨げる。
3. 自動テストはCRA初期ファイル程度で、モデル編集・保存・実行の回帰テストがない。
4. 未完成機能と稼働機能がコード上で混在している。
5. モデル名・ファイル名に綴り揺れがあり、概念の検索性が低い。

## 11. 再構築時に保持すべき資産

- ユーザーが理解しやすいツリー中心の編集体験
- 1つのProjectモデルでアプリ全体を持ち運べる点
- commonとapp固有定義を分ける再利用モデル
- Testと公開ランタイムが同じ意味論で動く点
- Region切替による環境複製の考え方
- UIだけでなく状態、条件、非同期処理、API呼出しまで表現できるノード体系
- 既存の本番Project JSONを新形式へ移行するためのReader互換性

## 12. 推奨する再構築境界

```text
Editor Web App
    ↓ typed commands / validated project schema
Application API
    ├─ Authentication / Authorization
    ├─ Project revisions / publishing
    ├─ Environment promotion
    └─ Data API (parameterized queries only)
         ↓
Database

Published Runtime（Editorとは別配布）
    ↓ signed immutable release artifact
Sandboxed expression/runtime engine
```

最低限、次の概念を第一級のエンティティにすることを推奨する。

- User / Team / Role
- Project
- ProjectRevision
- Environment
- Release
- Launcher / Route
- DataSource / DataSchema
- AuditLog
- Secret

## 13. 未確認事項とヒアリング候補

1. 本番のDB APIサーバー実装と、`/select`・`/update` の認証・SQL制限
2. 実運用のユーザー数、プロジェクト数、Project JSON最大サイズ、同時利用数
3. 本番・テスト複製の実際の操作手順と、複製対象（アプリ定義、DBスキーマ、データ、秘密情報）
4. `permissions` の intended specification と現在の利用有無
5. 公開アプリが匿名公開か、社内限定か、利用者認証を持つか
6. 同梱DBがサンプルか実運用データか
7. Nativeノード・数式で許可しているJavaScriptの範囲
8. 削除、復元、履歴、同時編集、監査ログの現行運用
9. メールによるログイン情報通知機能の現行稼働有無
10. モバイル対応、ブラウザ要件、アクセシビリティ要件

## 14. 解析上の制約

- `node_modules` が同梱されておらず、依存取得を行っていないため、実ビルドと実画面操作は未検証。
- バックエンドコードがないため、サーバー側の防御やデプロイ仕様は判断していない。
- コメントに文字コード由来の文字化けがあり、一部の設計意図はコード動作から推定した。
- 本文は第1版であり、代表的な本番Project JSONと運用ヒアリングを加えることで精度を上げる必要がある。
