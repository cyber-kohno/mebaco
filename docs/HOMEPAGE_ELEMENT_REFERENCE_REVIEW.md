# 個別要素リファレンスの検証・拡張方針

## 今回の範囲

App、Entry、Component、State、Tag、Textの基本6要素と、Props、Value Prop、Component Use、Slots、Slot、Slot Use、Slot Contents、Slot Content、Retentionの再利用関連9要素を個別仕様化した。`apps/homepage/src/data/element-reference-catalog.mjs` に各ページ、照合日、根拠ファイル、導入バージョンの状態を集約する。

`source-reviewed` は現行実装の照合状態であり、配布ビルドでの実機確認や初版のサポート保証を意味しない。導入バージョンは未確定（`null`）とし、Studioの開発版番号だけを根拠に断定しない。

## ページの共通項目

概要 / 配置場所と操作 / 子要素 / 設定項目 / 参照とスコープ / 実行時の動作 / 最小例 / 制約と注意点 / 関連項目 / 実装照合・バージョン。

`check-doc-coverage.mjs` は、Registryとの対応、個別kind・URLの重複、レビュー状態、日付、本文の必須見出し、根拠表示コンポーネント、根拠ファイルの存在を検査する。本文の意味や実装挙動を自動で保証するものではない。

要素一覧では、個別ページがあるkindだけに「〜の仕様」を表示する。それ以外は「分野ガイド・索引」と表示し、82要素がすべて個別仕様化されたと誤認させない。

## ソース照合で明確にした境界

- AppのIdはハイフン後の区切りも英小文字から始める。内部appIdは表示Idと別。
- Entryの候補は所属App内の通常Component。CommonとローカルComponentは入口の直接参照候補ではない。
- EntryのProps式はApp側で評価し、参照先ComponentのローカルStateは使わない。Component切替でBindingsをクリアする。
- Componentの定義とcomponent-useは別。通常の再描画とインスタンス破棄・再作成を区別する。
- StateのInitialは既定値の準備後にツリー順で評価する。$propsは渡されない。失敗時は型の既定値へフォールバックする。
- Stateのトップレベル代入通知と深い変更を区別する。イベント後の再描画だけを根拠に深い変更が常に自動追跡されると書かない。
- Tagの属性カタログにない名前と、予約された名前は異なる。イベントはon属性ではなくAdd Eventで設定する。
- Tagのイベント失敗時にStateの変更をロールバックする保証はない。Ref操作のtransactionをアプリ状態全体のtransactionと説明しない。
- Textのエディターの期待型stringと、Runtimeでのnull・undefined・その他の値の表示処理を分ける。

## 初版公開前の追加確認

- [ ] 6要素の追加・更新・配置と表示を配布ビルドで確認。
- [ ] Idの境界値、禁止文字、予約名、重複名を確認。
- [ ] Entryの選択候補、参照変更、Propsの固定値・式・既定値・型エラーを確認。
- [ ] Componentの再利用、ローカルStateの分離、破棄時の寿命、再帰エラーを確認。
- [ ] Stateの型別Initial、評価順、フォールバック、再描画通知を確認。
- [ ] 対応Tag、void Tag、Retention構造、予約属性、イベントフラグとAction失敗を確認。
- [ ] Ref・Partialの重複、未設定、空・非文字列キー、インスタンスの分離を確認。
- [ ] Textのモード切替、上限、文字列型、エラー表示、無効化を確認。
- [ ] 全導線を確認し、導入バージョンと本文の表現をリリース内容に合わせて確定。

## 次に拡張する範囲

Variable・Constant・Function・Action・Effectなどの個別仕様へ進む。関連ページへのリンクがあるだけで、そのページ本文が完成したという扱いにはしない。

## 2026-10-02の基本6要素の確認結果

- Astroビルド成功: 36ページとPagefind検索インデックスを生成。
- 台帳チェック成功: 82 kindの索引、28機能、個別仕様6ページの必須見出しと61件の根拠参照を確認。
- 生成HTMLの内部リンク・アンカー1,929件を検査し、欠落なし。
- Studioの既存テスト8ファイル、59件が成功。対象はRuntimeTree / RuntimeProps / RuntimeState、Tag属性カタログ、Refキー、Partialキー・Registry、要素編集の入力スキーマ。
- デスクトップ版Studioの通し操作・画面キャプチャは未実施。上記の結果は実機確認の代替ではない。
- 既存のMarkdown設定非推奨警告と、公開URL未設定によるsitemap省略は残る。公開先確定時に再確認する。

## 再利用関連9要素の追加照合（2026-10-02）

`guides/reuse-components.md` に、Panelを2つ使用し、Propsで見出し、Slotで本文、RetentionからSlot Propsで計算値を渡す手順を追加した。独立したローカルStateの発展例も含む。

### ソースから確認した境界

- Value Propの定義時のDefault Valueは固定値または型の既定値で、任意の式ではない。割当て欄の固定値・式と区別する。内部propIdで対応付ける。
- `runtime-props.ts` の割当て式では `$props` を解決中の受取側の値へ置き換える。呼出側Propsの転送にはRetentionで `$var` に取り出す。Runtimeの配列・Objectの型チェックは浅く、全フィールドの厳密検査を保証しない。
- Component Useは使用箇所ごとにローカルStateを持つ。Slotの差し込み内容は呼出側コンテキストへSlot Propsを設定して描画し、定義側のローカルStateへ切り替えない。
- Slotの定義、Slot Useの表示位置、Slot Contentの呼出側内容を分ける。Slot Use自身の子はフォールバック表示に使われない。
- `ElementDispatcher.svelte` はSlot情報をRenderSlotUseに渡すが、Tag・Conditional・Switch・Loop・Block側への受渡しがない。これらの子の描画でSlot情報が途切れるため、ガイドはElements直下に限定する。これは実装上の確認事項であり、一般的なSlotの概念と混同しない。
- `component-use.ts` のsyncSlotsは内部slotIdで既存内容を再利用する。一致しない内容は削除され得る。Slot定義変更が全使用箇所へ即時同期されると断定しない。
- Retentionは再評価ごとに変数フレームを準備する。Blockは同じフレームで展開し、子ホストは親の変数を引き継いだフレームを作る。Stateは深い値も読み取り用。let変数の更新とStateの更新を分ける。

### 追加の公開前確認

- [ ] 再利用ガイドの全手順を配布ビルドで操作し、画面キャプチャを取得。
- [ ] Propsの必須・既定値・null・型不一致、定義順による式の参照範囲を確認。
- [ ] Component Useの候補、循環参照の除外、Props変更、各インスタンスのStateの分離を確認。
- [ ] Slot Useの直接配置とTag・各制御要素内の配置を比較し、公開する制約を確定。
- [ ] Slot Contentの呼出側StateとSlot Props、内容未設定時と必須Prop未設定時を確認。
- [ ] Refresh slotsの追加・改名・並べ替え・削除・参照先切替と内容保持、保存したProjectからの復旧を確認。
- [ ] Retentionの評価順、const/let、型エラー、深いState更新禁止、再描画時の再評価を確認。

## 式・型リファレンス追加後の確認

- リファレンス3ページ（式・コード、型システム、式とスコープの概念）を具体化し、Object Type / Union Type / Signature Typeの個別ページを追加。
- Coverage checker成功: Registry 82種、機能台帳29項目・88ソース参照、個別仕様18ページ・138ソース参照。
- Astroビルド成功: 48 HTMLページとPagefind検索インデックスを生成。
- 旧Markdown設定APIの非推奨警告と、公開URL未設定によるsitemap省略が残る。Studioデスクトップでの通し操作は今回実施していない。

次の個別仕様候補はFunction Procedure / Return、Promise、Loop、Conditional / Switchなどの制御要素。式・Actionごとのawait条件と副作用は各要素ページに追加していく。

## 値と処理5要素の追加（2026-10-02）

Variable、Constant、Function、Action、Effectのページを追加した。処理欄ごとのState更新可否とawait、定数の評価順、Variableのフレーム、Functionの引数・戻り値検査、Effectの再実行・Abort条件を実装と照合した。

Studio実機での全経路の通し操作、Effectの連続更新・中止時の配布ビルドでの確認は未実施。

### 追加後の確認結果

- Coverage checker成功: Registry 82種、機能台帳29項目・88ソース参照、個別仕様23ページ・172ソース参照。
- Astroビルド成功: 53 HTMLページとPagefind検索インデックスを生成。
- Studioテストは追加・実行していない。この段階はドキュメント変更で、既存テストコード・製品実装を変更していない。
- Markdownプラグイン設定の非推奨警告と、公開URL未設定によるsitemap省略は残る。

Studioの製品実装はこの文書作業で変更していない。実機確認と初版バージョン確定は引き続き未実施。

## 制御・非同期処理16要素の追加（2026-10-02）

Conditional / If / Else If / Else、Switch / Case / Default、Loop、Function Procedure / Return / Block、Promise / Then / Catchについて、表示用とFunction Procedure用の違いを含めて個別ページ化した。Loopは反復表示であり、Procedure内の反復処理ではないこと、PromiseのThen/CatchとFunctionの戻り値が別の制御経路であること、Blockが独立したVariableFrameを作らないことを実装照合に基づいて明記した。

### ソースから確認した境界

- ConditionalとSwitchには表示用kindとProcedure用kindがあり、枝要素を共有する。枝の操作メニュー・子要素・実行文脈は親kindによって異なる。
- 条件は順序評価で最初の真の枝を選択し、Boolean以外は実行時エラー。Switchは型付き値の完全一致で1枝を選び、Case重複・型違い、複数Default、末尾以外のDefaultをエラーにする。
- LoopはCount（0以上の有限整数）またはFor Each（配列）で表示Retentionを反復し、最大10,000件。各反復は親変数を基にしたフレームにItem/Indexをconstとして束縛する。FunctionRunnerに処理Loopはない。
- Promise式自体は同期評価でPromiseを返す必要がある。解決値は宣言型で検査し、Thenへ束縛する。Catchは任意で、未処理Rejectは失敗報告となる。Then/CatchからFunction Returnはできない。
- Function Returnは到達時に後続処理を停止し、値を親Functionの戻り値型と照合する。Promise枝は呼出し処理の完了後に独立して継続する。
- Blockは子を順に展開するグループで、同じVariableFrameを使う。スコープを区切る機能ではない。
- 分岐要素の無効化状態とRuntime選択の関係は、Resolverの直接確認だけでは公開仕様として断定せず、配布ビルドでの確認事項に残した。

### 追加後の確認結果

- Coverage checker成功: Registry 82 kind、機能台帳29項目・88ソース参照、個別仕様39/82要素・256ソース参照と全共通見出しを確認。
- Astroビルド成功: 69 HTMLページとPagefind検索インデックスを生成。公開URL未設定のためSitemapは省略され、既存Markdownプラグインの非推奨警告が残る。
- `git diff --check` 成功。CRLF/LF変換に関する警告は残るが、空白エラーはない。
- Studio製品実装とテストはこの段階で変更していない。デスクトップ配布ビルドでの通し操作・初版対象確定は未実施。

## Resource／Storage関連8要素の追加（2026-10-02）

Resources、Directory / Text / SQLite Resource、Resource Imports、Storage、Key Value、Storage Importsの個別仕様を追加し、既存のResourceとStorageガイドを操作手順に置き換えた。Resourceの「定義・App Import・絶対パスBinding」と、Storageの「定義・App Import・開発／Package別永続スコープ」を分けて説明する。

### ソースから確認した境界

- Resource定義はProjectにあり、AppのImport IDだけが各Appの`$resource` Namespaceに露出する。Resource設定のみでは物理パスは確定せず、Development ConfigurationまたはClient PackageのパスBindingを要する。
- 現行ResourceRuntimeの既定作成経路は最初のDebug ConfigurationのBindingを使う。複数Configurationの選択状態がRuntimeへ反映されるとはソース上で確認できないため、文書で注意喚起し実機確認へ残した。
- Directory ResourceはReadが初期値。DirectoryのWrite、Delete file、派生Text/SQLiteのAllow・Access・Patternは別の許可スイッチで制御される。相対パスの親移動・絶対パスは拒否され、ネイティブ側でResource境界とシンボリックリンクを検証する。
- Text ResourceはUTF-8 read/write。SQLiteはQuery、Read-Write時のExecute/Transaction APIを提供し、値パラメーター、整数範囲、BLOB変換、外部DB接続・手動Transaction制御の制限がある。
- Key ValueはState定義を再利用するが、Initialは固定値または型既定値で式不可。StorageTypeCatalogでSignatureや非永続型を候補から除き、RuntimeでもJSON互換を要求する。
- Storageはget時に既存値がなければInitialを永続保存する。開発Project IDと配布Package IDは別scope。StorageはStateの依存追跡ではなく、setによる自動再描画も提供しない。
- Resource I/OとStorage get/setは非同期。失敗を通常の成功値とみなさず、呼出元のAction／Async Functionで扱う。

### 追加後の確認結果

- Coverage checker成功: Registry 82 kind、機能台帳29項目・88ソース参照、個別仕様47/82要素・300ソース参照と全共通見出しを確認。
- Astroビルド成功: 77 HTMLページとPagefind検索インデックスを生成。
- 76 Markdownページ内のサイト内ルートリンクを生成済みHTMLに照合し、欠落なし。
- Markdownプラグイン設定の非推奨警告と、公開URL未設定によるSitemap省略が残る。
- Studio製品実装とテストは変更していない。ローカル/ClientでのResource Binding、SQLite権限、Storage再起動後の値確認は初版公開前のデスクトップ確認に残す。

### 追加後の自動確認結果

- Astroビルド成功: 45ページとPagefind検索インデックスを生成。
- 台帳チェック成功: 82 kindの索引、28機能と80件の根拠参照、個別仕様15ページの共通項目と119件の根拠参照を確認。
- 生成HTMLの内部リンク・アンカー3,102件を検査し、欠落なし。
- Studioの既存テスト7ファイル、60件が成功。対象はRuntimeProps、RuntimeState、RetentionResolver、VariableFrame、StateView、要素編集スキーマ、Retentionのメニュー。
- `git diff --check` 成功。生成ファイルなどの改行コード警告は内容の欠落を示すものではない。
- Markdown設定の非推奨警告と公開URL未設定によるsitemap省略は継続。SlotのSvelte描画経路やガイドのデスクトップ通し操作は、これらの自動確認では検証していない。

## 式・型リファレンスの追加（2026-10-02）

式・コード、型システム、式とスコープの概念ページを執筆し、Object Type、Union Type、Signature Typeを個別仕様へ追加した。定義の使い方、型候補の範囲、入力時の診断とRuntime実行の違いを記録した。既存の15要素から18要素へ増えた。

### ソースから確認した境界

- Formula入力のStudio側ではProjectから型宣言を構成し、式の名前や期待型を診断・補完する。RuntimeのScriptCompilerはTypeScriptをJavaScriptへ変換して実行するが、この変換時に型チェックはしない。
- 式・Action・Function Codeなどで注入される参照は欄のmodeに依存する。`$resource` / `$storage` / `$log` / `$transition` / `$invalidate` / `$event`等を、全ての式に共通と説明しない。
- `$state` は所属先・StateScopeで見える定義に従う。Retention評価中は読み取り用。State Initial用のRuntime ContextにはPropsを渡さない。
- `$var` はRetentionやFunctionの逐次宣言に加え、Loop Item/Index、Promise Then/Catchなどのブランチ値が局所的に加わる。宣言順を含むため、Project全体で一律な可視性ではない。
- 名前付きObject / Union / Signature TypeはCommon、所属App、囲むローカル宣言スコープから収集される。他App固有の型を自動で候補にしない。
- Nullable、ObjectプロパティのOptional、配列深度は独立する設定。型情報の存在と、各Runtime要素による検証深度を同一視しない。
- Object Typeの継承は重複・循環・ローカル上書きを許さない。Union TypeはLiteralかObjectのいずれか。Signature TypeはFunctionの実装そのものではない。

Studio本体はこの文書作業で変更していない。型定義を使ったエディターからPreviewまでの通し操作と、欄別の非同期・副作用制約は今後の配布ビルド確認に含める。

## Style・Debug・Release仕様の追加（2026-10-02）

Style 6 kind、Debug 6 kind、Release／Bundle 3 kindを個別ページ化し、Style適用、Debug設定、配布とClient導入の各ガイドを操作の流れに沿って具体化した。個別ページは62/82 kind、根拠ソース367件になった。

### ソースから確認した境界

- StyleはCommon/Declares/Stylesに定義し、Tagから適用する。Parameter、Style local、KeyframesはStyleのスコープに属し、Tag側の式コンテキストとStyle内の式コンテキストを区別する。
- Studioの既定Resource RuntimeはDebug Configurationsの先頭にあるBindingを参照する。Configuration切替のユーザー向け挙動は別途実機確認が必要で、ガイドでは選択中Configurationが反映されると断定しない。
- Debug Launch ShortcutはWorkspaceからPreviewを起動する開発補助。Bundleに入れるLauncherやClient側のLaunch Setupとは別の機構。
- Bundleは選択Launcherから到達するApp／Transition依存と参照Resourceを解析する。Common Moduleは含まれるが、Resourcesフォルダー全体をそのまま含めるわけではない。Storage Importは保存データをPackageに埋め込むのではなく、参照先の存在を検証する。
- `build <id>`がRevisionを記録し、同一Content hashではGenerationを増やさない。`release <id>`には保存済み・未変更ProjectとBuild済みの最新Revisionが必要。`.mbcapp`はManifestとModuleデータを含む。
- ClientのPackage画面でInstallし、Launch SetupでLauncherとResource Pathを設定してから起動する。Studio Debug BindingはPackageに移行しない。

### 自動確認

- 台帳照合: 82 kind、29機能、88機能根拠、個別仕様62/82、必要見出し、367個別仕様ソース参照が通過。
- Astro静的ビルド成功: 92 HTMLページとPagefind検索インデックスを生成。
- 91 Markdownページ内の内部ルートリンクを生成HTMLに照合し、欠落なし。
- `git diff --check`成功。改行コードのLF→CRLF警告はあるが、空白エラーはない。
- Markdown plugin設定の非推奨警告と、`site`未設定によるSitemap省略が残る。BundleのBuildからClient起動までのStudioデスクトップ通し確認は未実施。

## Project／Launcher構造の追加（2026-10-02）

Project、Common、Apps、Launchers、Launcher、Launch Options、Launch Arguments、Launch Argumentを個別仕様へ追加した。個別仕様は70/82 kind、408ソース参照となった。

### ソースから確認した境界

- Project Tree FactoryはApps、Launchers、Release、Common、Debugを初期配置する。主要な管理領域はユーザーが自由に追加・削除するElementではない。
- Add appはAppを作成した後、Main Component作成の確認を表示し、同意した場合は作成したComponentをEntryに設定する。
- CommonのDeclares、Resources、StorageとApp内定義は異なるスコープ。Resource／Storageは定義だけでなくApp Importが必要。
- LauncherはApp参照と引数Bindingを保持する。AppのLaunch ArgumentはValue Prop契約へ変換され、Launcher等の起動元でBindingされる。
- Launch ArgumentのDefault Valueは式ではなくLiteralまたは型既定値。明示値なしの場合、NullableはNullの既定値に変換され、非Nullableでは呼出元からの供給が必要。
- Launch ArgumentはEntry Component Propsとは別契約。Entry Propsへの値受渡しはEntryのBindingとして設定する。

### 自動確認

- 台帳照合: 82 kind、29機能、88機能根拠、個別仕様70/82、必要見出し、408個別仕様ソース参照が通過。
- Astro静的ビルド成功: 100 HTMLページとPagefind検索インデックスを生成。
- 99 Markdownページ内の内部ルートリンクを生成HTMLに照合し、欠落なし。
- 起動引数からEntry／Launcherを経てPreview・Bundleへ進むStudioデスクトップ通し確認は未実施。

## 管理ElementとImport・Transition仕様の追加（2026-10-02）

Declares、Constants、Types、Functions、Components、Elements、Store、States、Effects、Import、Transitions、Transitionを個別仕様へ追加した。これによりStudio Element Registryで管理される82 kindすべてに個別ページがあり、ページ根拠は467件となった。

### ソースから確認した境界

- Declares／Store／Importなどの管理Element自体は値やRuntime処理を提供せず、子の定義・設定の場所を表す。
- ElementsはContent・Directive・Blockの追加メニューを持つが、許容される子はElement RegistryとContent Placement制約に従う。
- StoreはAppとComponentに初期配置され、StatesとEffectsを保持する。Stateの可視性と寿命は所属範囲に依存し、Storageによる永続化とは異なる。
- Effectはmount後に初回実行され、Dependencies式が異なる値になったときに再実行される。非同期処理の競合・中断を考慮する必要がある。
- ImportsはTransitions、Resource Imports、Storage ImportsをAppごとに保持する。定義があるだけでは、そのAppのImport済み依存として利用できない。
- TransitionはTransitionsに登録された別Appのみを対象にし、遷移先のLaunch ArgumentsをBindingしてからRuntime遷移要求を発行する。

### 自動確認

- 台帳照合: Registry 82 kindすべての個別仕様、必要見出し、467個別仕様ソース参照が通過。
- Astro静的ビルド成功: 112 HTMLページとPagefind検索インデックスを生成。
- 111 Markdownページ内の内部ルートリンクを生成HTMLに照合し、欠落なし。
- 全82ページの内容照合・デスクトップでの編集からRuntimeまでの通し確認は、公開前レビューとして継続する。
