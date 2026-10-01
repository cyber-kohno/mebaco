# Mebaco ホームページ向け機能台帳

ホームページに何を掲載するかを、実装の存在と初版で案内する範囲に分けて管理する。

機械可読な項目は [`homepage-feature-catalog.mjs`](./homepage-feature-catalog.mjs) に置き、Astro側の `npm run check:coverage --workspace @mebaco/homepage` で根拠ソースと公開ページへのリンクを検査する。この文書は分類基準、現時点の判断、公開前レビューを記録する。

## 判定の意味

| 項目 | 意味 |
| --- | --- |
| `implementation: observed` | 現在のソースコードに機能の実装を確認した。画面品質、全条件、公開対応、完成度まで確認したという意味ではない。 |
| `implementation: not-code-derived` | 製品運用やユーザー確認に基づく項目。アプリ実装からは決められない。 |
| `publication: candidate-v1` | 初版の案内候補。初版ビルドで動作確認し、ユーザー向け用語と制約を確定する。 |
| `publication: review-before-v1` | 実装は確認したが、互換性、データ寿命、権限、配布形態など公開内容の追加確認が必要。 |
| `publication: needs-product-decision` | 初版で公開・サポートするかを決める必要がある。MCPの変更操作が該当する。 |
| `publication: confirmed-user-policy` | この会話でユーザーが確認した方針。無料ソフトとして、ダウンロード可能な初版完成時にサイトを公開する。 |

`observed`を「製品仕様として確定」や「初版の保証対象」と読み替えない。特に権限、保存場所、互換性、外部通信、セキュリティ境界は専用の検証と判断が必要。

## 現時点の機能範囲

| 分野 | 台帳項目 | 現時点の扱い |
| --- | --- | --- |
| Studio | 画面と作業領域、Projectの作成・読込・保存 | 初版の導入導線候補 |
| 編集 | Program Tree、要素編集、ツリー移動、参照グラフ、履歴、検索、ショートカット | 基本操作と上限を初版UIで確認 |
| 操作支援 | Command Console、実行可能なコマンド、入力補完、対話プロンプト | 使えるコマンドと利用条件を確認してガイド化 |
| 記述 | 式、TypeScript、型情報、式検証 | 入力時の型診断、Runtimeの変換・実行、位置ごとのスコープを分けて説明。副作用と非同期は欄ごとに要確認 |
| モデル | App、Entry、Component、Props、Slot、Retention | 概念と要素リファレンスの中心。Slotの配置とProps評価範囲は公開前の追加確認対象 |
| 実行 | Runtime、View、制御構造、State、Action、Function、Effect、Transition | 実行順と失敗時の挙動を仕様化。主要値・処理5要素を個別化 |
| 見た目 | Style、Parameter、継承、状態別ルール、Animation | Runtimeの解決規則を仕様化 |
| データ | Resource、ファイルアクセス、Storage | パス、読書き、保存スコープを公開前に確認 |
| 確認と配布 | Preview、Debug、Launcher、Release、Bundle、Client | 実機での一連の配布・更新・起動確認が必要 |
| 拡張と連携 | 設定、言語、MCP読み取り・検証・変更操作 | MCP変更操作は初版の掲載判断が未決 |
| 運用 | ダウンロード、互換性、ライセンス、プライバシー、問い合わせ先 | 配布物・運用方針を確認して確定 |

各行の根拠ファイルとページ対応は台帳ファイル内の `sources` / `page` を参照する。

### 式と型の参照範囲（2026-10-02）

`expressions-editor` を `review-before-v1` とした。式エディターは見える名前と期待型の宣言を作って補完・診断を行う一方、Runtimeの式実行はTypeScriptの構文変換を経て行われる。構文変換自体は型検査ではないため、説明で混同しない。`value-types` は現行の値型構造と型候補のスコープを台帳へ登録した。欄別の副作用、await条件、配布ビルドの挙動は引き続き公開前確認の対象。

- Common・所属Appの名前付き型と、Retention・Function・Promise分岐などのローカル型候補を区別する。
- Value TypeのNullableとOptionalを区別し、配列型のNullableは配列全体へかかると説明する。
- Props、Retention Variable、StateではRuntime検証の範囲が同じでないことを説明する。

### 値と処理の個別仕様（2026-10-02）

Variable、Constant、Function、Action、Effectの個別仕様を追加した。Function引数・戻り値の検査、Constantの逐次評価、Variableの初期評価とconst / letの違い、Actionの配置先ごとの実行ポリシー、Effectの依存値比較と中止通知を分けて説明する。リリース前の配布ビルドで各経路のUI操作と非同期処理を確認する。

### 再利用仕様の照合で見つかった確認事項（2026-10-02）

`project-concepts` は `review-before-v1` とした。これは製品の対応範囲を決定したという意味ではなく、公開説明の追加検証が必要という記録である。

- Slot Useへ渡すSlot情報は、現行のTagや制御要素の内部描画経路で引き継がれない箇所がある。ガイドはComponentのElements直下に限定し、深い配置の対応は配布ビルドで確認する。
- Propsの割当て式の `$props` は呼出側ではなく、解決中の受取側Propsになる。ガイドではRetentionの `$var` を介して親の値を渡す。
- Slot Use自身の子をフォールバック表示する処理は確認できない。呼出側にSlot Contentを用意する。
- Refresh slotsでは削除されたSlotや参照先切替で一致しないSlotの内容が失われ得る。変更時の保存・バックアップと復旧手順を実機で確認する。

詳細な根拠と確認項目は [`HOMEPAGE_ELEMENT_REFERENCE_REVIEW.md`](./HOMEPAGE_ELEMENT_REFERENCE_REVIEW.md) に記録する。今回の作業ではStudio実装を変更していない。

## 公開前に決めること

### 製品範囲

- MCPサーバーは初版の標準機能として案内するか、任意機能・開発者向け機能として分けるか。
- MCPからの変更操作を初版で有効にするか。変更可能な操作、Dry Run、Revision不一致、操作失敗時の扱いをどのように利用者へ説明するか。
- Projectの後方互換性と自動移行をどの範囲でサポートするか。
- Undo/Redoの履歴が保持される期間・上限、アプリ再起動後に復元できるか。

### データと権限

- Resourceがアクセスできるファイル・ディレクトリ、読込・書込範囲、利用者が許可するタイミング。
- Storageの保存場所、App間の分離、データの削除方法。
- アプリ、MCPサーバー、配布されたBundleが行う外部通信と、ローカルデータの扱い。

### 配布とサポート

- 対応OSと最低動作環境、インストーラー形式、署名・チェックサムの掲載方法。
- Project、Schema、API、Bundle各形式の互換性方針。
- 同梱・依存コンポーネントのライセンス、プライバシー文書、問い合わせ先。

未決事項が残る機能は、ページを作って断定する代わりに「初版で未対応」「実験的」「確認中」のどれにするか製品判断を行う。

## ソース照合の限界

Element kindの照合はElement Registryへの追加・削除の漏れを検知する。機能台帳チェッカーは登録した根拠ファイルとページの存在を検査する。どちらも、設定項目、親子制約、Runtime動作、説明文の正確さを自動保証しない。

将来のリリース作業では各仕様ページに次を追加し、実装と人手で照合する。

- 操作または設定名と、ユーザー向け名称
- 有効な親・子、入力条件、既定値、型
- 式の可視範囲、参照関係、更新条件
- Runtimeでの動作、エラー、制限
- 初版バージョンと互換性
- 根拠となるDomain Model、Editor Definition、Runtime、検証コード
