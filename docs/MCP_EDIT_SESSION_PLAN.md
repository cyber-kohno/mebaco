# MCPエージェント編集セッション

## 段階的な実装と実機確認

各段階で自動テストを行い、StudioとMCPを更新して実機確認する。

現在、第1〜第5段階の機能実装と自動検証は完了している。追加実装を待つ項目と、実装済み機能の実機確認を待つ項目を混同しない。第5段階の残りは実機確認であり、問題が見つかった場合に修正する。

| 段階 | 内容 | 確認ポイント |
| --- | --- | --- |
| 1 | checkout/checkin/状態取得、ヘッダー表示、手動解除 | 開始・二重開始拒否・ID検証・終了通知・解除・再開始 |
| 2 | 保存対象の編集ロック、更新ツールのcheckoutId検証 | 人間のcommit拒否、選択・開閉・draft入力許可、MCP更新のライブ反映 |
| 3 | 要素ダイアログ終了制御 | checkin時に未確定draftを破棄して閉じ、その後に完了通知 |
| 4 | Rustメモリの専用checkpoint、rollback | 開始時状態へ一括復元、revisionは増加、ロック解除 |
| 5 | 履歴グループ化、中断時の復旧 | 1作業をUndo 1回で復元、破棄した作業を通常Redoで再適用しない |

Stage 1: 2026-10-08実装。ユーザーによるStudio実機確認完了（checkout/checkin、MCP停止拒否）。
Stage 2: 2026-10-08実装。更新版MCPの反映、所有権/revision拒否、ユーザー編集ロック、チェックイン、統合バッジを実機確認済み。
Stage 3: 2026-10-08実装。Studioでのダイアログ自動終了の実機確認完了。
Stage 4: 2026-10-08実装。Rust専用checkpointと`cancel_edit_session`によるrollbackを追加。実機確認完了（App/Tag作成・Disable・プロパティ更新→cancel、誤ID/古revision拒否、選択/dirty復元、ロック解除、取り消し通知・Redo非復活）。
Stage 5: 2026-10-08実装。履歴グループ化と中断後の保持/rollback選択を追加。自動検証、通常checkin後のグループUndo/Redo、バッジからの保持終了・rollbackの実機確認完了。残りはno-op checkoutと一部のキャンセル/ダイアログ表示確認。

残りの実機確認:

- [x] バッジから「開始時へ戻して終了」し、検証用Appが消え、編集ロック解除と取り消し通知が起きることをユーザーが実機確認。
- [x] 取り消した今回の作業がCtrl+Yで復活しないことをユーザーが実機確認。開始前からあったRedoは保持されるため、別の過去作業の再適用と区別する。
- [ ] 参照/選択だけのcheckout→checkinで、不要なUndo履歴が増えず、開始前のRedoが維持されることを確認する。
- [ ] 手動解除確認のキャンセルで、編集ロックと要素ダイアログの未確定入力が維持されることを確認する。
- [ ] 要素ダイアログを開いた状態での手動終了、日英の表示、最新の簡略化した通知文を確認する。

第5段階の実機確認結果（2026-10-08）:

- 更新版Studio/MCPへの接続、Rust checkpoint作成、通常checkinの成功を確認。
- 検証用App作成・div追加・Disable・コメント編集の4操作でrevisionが0から4へ増加し、各変更がライブ反映された。
- ユーザーがCtrl+Z 1回で作業全体を戻し、Ctrl+Y 1回で最終状態を復元する動作と選択状態を確認し、問題なしと報告。
- 最終的なMCP再取得でApp/Componentなし、20ノード、dirty=false、idle、編集ロック解除を確認。現在revision=11、選択ノード=6。操作回数と現在の選択状態だけから、途中の全遷移は推定しない。
- 検証用Appに4操作を加えてcheckoutを維持し、バッジから「編集内容を維持して終了」→ロック解除→Ctrl+Zで作業全体を戻す手順について、ユーザーが問題なしと報告。
- バッジからの解除確認をキャンセルしてcheckoutが続くこと、その後「開始時へ戻して終了」で検証用Appが消え、取り消し通知・ロック解除・Ctrl+Yでの非復活をユーザーが問題なしと報告。
- 最終状態を再取得し、検証用Appなし、20ノード、`dirty=false`、編集セッション`idle`、`rollbackAvailable=false`を確認（revision 5）。
- 保存は行っていない。参照/選択だけのcheckout、バッジからのrollback、確認Cancel・日英表示などは引き続き実機確認対象。

自動検証結果:

- Studio全体テスト: 177ファイル / 1,055件成功（グループUndo/Redo・中断復旧・旧native未反映時の安全な拒否を含む）。
- Svelte / TypeScript check: エラー0件、既存a11y警告2件。
- Studio Rustテスト: 28件成功（履歴共有・グループUndo/Redo・所有権・変更なし時のRedo保持・履歴上限を含む）。
- MCP Rustテスト: 14件成功。
- MCP releaseビルド: 成功。
- Studioフロントエンドの本番ビルド: 成功（既存a11y/チャンク関連警告あり）。
- 生成したrelease exeのstdio initialize / tools/list: 成功、29ツール。cancelを追加。8つの更新ツールとcheckin/cancelでcheckoutId/expectedRevision必須、参照・選択・PreviewではcheckoutId不要を確認。

生成先: `apps/mcp/target/next-release/release/mebaco-mcp.exe`。
第2段階の更新版MCPは正式接続で反映確認済み。
第3段階はStudioフロントエンドのみの変更で、MCP再ビルド・Codex再起動は不要。
第4段階はStudioのRust/フロントエンドとMCPを変更したため、Studio再ビルド・再起動とMCP exe反映・Codex再接続が必要。
第5段階もStudioのRust/フロントエンドを更新する。MCPツール数/引数は29のままで、ツール説明を更新した候補exeを生成した。
以後MCP exeを更新する場合は、利用側のMCP接続を無効化してstdioプロセスを停止した後、反映する（Studioの`mcp stop`だけではstdioプロセスは終了しない）。
再検証は`apps/mcp`で`node scripts/verify-stdio.mjs`。引数で任意のexeパスを指定可能。
このスクリプトはStudioのツリーやcheckoutを操作せず、自身が起動したstdioプロセスだけを終了する。

## 第1段階のAPI

開発セッション公開とエージェントの編集checkoutは別の状態。
Studioの現在のプロジェクトに対してcheckoutは最大1件。

- `checkout_edit_session(sessionId, expectedRevision)`
  - revision一致を確認してランダムなcheckoutIdを発行する。
  - `status: checked_out`, sessionId, checkoutId, startedRevision, startedAtEpochMs, revisionを返す。
  - 既存checkoutがあれば`EDIT_SESSION_ACTIVE`。上書きや自動引継ぎは行わない。
- `get_edit_session_status(sessionId)`
  - `idle`または`checked_out`と現在revisionを返す。
- `checkin_edit_session(sessionId, checkoutId, expectedRevision)`
  - 現在revisionとcheckoutIdが一致するとcheckoutを解除する。
  - idle, startedRevision, revision, revisionChangedを返す。
  - Studioの現在のロケールで作業完了ダイアログを表示する。ユーザーのOKを待たずMCP応答を返す。
  - 自動保存は行わない。

開始・通常終了はTreeStoreとrevisionを変更しない。第5段階の通常終了はUndo履歴を1作業として確定する（第1〜4段階の終了は履歴を変更しなかった）。
`revisionChanged`は開始後にrevisionが進んだかを示す。内容の完全一致判定ではない。
第1段階では`editingLocked: false`だったが、第2段階以降はcheckout中に`editingLocked: true`を返す。
第3段階までは`rollbackAvailable: false`。第4段階からはcheckpoint作成成功後に`true`を返す。履歴グループ化は第5段階。
要素ダイアログの自動終了は第3段階で実装済み。

エラー:

- `INVALID_PARAMS`: revisionの型・範囲、空のcheckoutIdなど。
- `REVISION_CONFLICT`: 取得時点と現在のrevisionが異なる。checkout状態は変更しない。
- `EDIT_SESSION_ACTIVE`: 二重checkout。
- `EDIT_OPERATION_IN_PROGRESS`: Rust Undo/Redoへのユーザー操作が進行中。完了後に最新revisionを読み直してcheckoutを再試行する。
- `EDIT_SESSION_NOT_ACTIVE`: 終了済みcheckoutへのcheckin。
- `EDIT_SESSION_MISMATCH`: 別checkoutIdまたは別開発セッションのcheckin。
- `SESSION_NOT_AVAILABLE`: 開発セッションが利用不能。

ヘッダーのMCPバッジはcheckout中だけ「エージェント編集中」・黄色系に切り替える。
専用の編集バッジや解除ボタンを別に並べない。編集中のバッジをクリックすると解除確認を開き、
第5段階からは「編集内容を維持して終了」「開始時へ戻して終了」を選んで解除する。前者は未保存の編集内容を維持する操作で、ファイルへの書き込みではない。hoverの説明とアクセシビリティラベルでも解除操作を案内する。
利用者向けのエージェント関連通知・確認文には、ファイル保存を行わない旨の補足を表示しない。編集結果・状態遷移・必要な操作案内に絞る。ファイル書き込みを行わない仕様自体は変更しない。
エージェント処理そのものは停止しないため、中断後に使用する。
解除確認を開いた後に新しいcheckoutが始まっていた場合、新しいcheckoutを解除しない。
checkout中の通常の`mcp stop`は拒否し、公開状態・checkout状態を維持する。
checkinまたはUIでの明示的解除後に停止する。停止拒否時はプロジェクトクローズ・再起動も中断する。
第5段階では開発セッション変更/消失時にcheckoutとcheckpointを維持し、復旧待ちにする。プロジェクトツリーのreplaceは旧プロジェクトの状態をクリアする。Studio/WebView終了後の復旧は対象外。
Codexだけを再起動してもStudioのcheckoutは残るため、バッジで保持/rollbackを選んで終了してから再checkoutする。

## 第1段階の実機確認手順

1. 未保存変更を必要に応じて保存してから、更新したStudioフロントエンドを起動する。
2. MCPを無効化してプロセスを終了し、更新済みバイナリを
   `apps/mcp/target/release/mebaco-mcp.exe`へ反映する。起動中のMCPプロセスは勝手に終了しない。
3. MCPを再度有効化し、Codexを再起動またはMCPへ再接続して3つの新ツールを確認する。
4. Studioで開発セッションを公開する。`list_development_sessions`から現在のsessionIdを取得する。
5. `get_project_summary`でrevisionを取得し、`get_edit_session_status`がidleであることを確認する。
6. checkoutを呼び、ヘッダーの「エージェント編集中」、checkoutId発行、revision不変を確認する。
7. 二重checkout、誤ったcheckoutId、誤ったrevisionでのcheckinを試し、状態が残ることを確認する。
8. 正しいIDと現在revisionでcheckinし、MCPバッジが通常表示へ戻り、作業完了ダイアログが出ることを確認する。
9. 再checkoutしてUIの手動解除を確認し、古いcheckoutIdでのcheckinが拒否されることを確認する。
10. checkout中の`mcp stop`・プロジェクトクローズ・再起動が拒否され、公開とcheckoutが維持されることを確認する。
11. checkinまたはUI解除後に`mcp stop`が成功することと、日本語／英語の拒否メッセージを確認する。

第1段階は編集ロックの確認段階ではない。実機では編集なしで開始・終了を確認できる。
RustメモリだけのcheckpointはStudioプロセス終了後には復旧できない。
後続段階の初期復旧対象はStudioが生きている間のエージェント中断・接続切断とする。

## 第2段階の編集ロック

checkoutは更新を行う場合だけ必要。参照ツール、ノード選択、Previewはcheckoutなしで利用できる。

- 8つの保存対象更新ツールで`checkoutId`を必須化する。
  - `create_application`, `apply_changes`, `set_node_disabled`, `update_node_property`,
    `delete_node`, `insert_node`, `move_node`, `update_node_attribute`。
  - 同じツールの`dryRun`もcheckoutIdが必要（編集セッション内の事前検証）。
  - handler入口で開発sessionIdとの対応を検証し、TreeStoreの適用直前にも所有権を検証する。
  - revisionによる競合検出も引き続き必須。checkin/手動解除後の古いcheckoutIdは更新できない。
- ユーザー更新はTreeStoreの共通トランザクションで拒否する。
  - 要素確定、追加・削除、並び替え、Disable/Enable、リファクタリング、履歴復元。
  - 拒否時はtree/revision/選択/履歴を変更せず、日本語・英語のロケールに応じたトーストを出す。
  - New/Open/CloseはTreeStoreを触る前のプロジェクト情報・検証結果の消去も防ぐ。
  - Openのnative dialog/file I/O後にも再検証する。MCP停止・Close・Restart拒否は第1段階のガードを維持する。
- Undo/RedoはRust履歴をpopする前に拒否する。開始済みの非同期Undo/Redo中はcheckoutを拒否し、完了/失敗時に予約を解除する。
- 選択、移動先へのナビゲーション、ツリー開閉、表示Criteria変更、ダイアログのdraft入力とCancelは許可する。
  - 要素ダイアログのCreate/Updateボタンを無効化し、preflight確認後の確定直前にも再検証する。
- MCPの各更新は共通トランザクションでその都度UIへ反映する。App/Main/Entry作成は1回のトランザクションとし、途中の不完全な構造は公開しない。
- 通常のファイル保存はツリー更新ではないため、この段階では禁止しない。checkinで自動保存は行わない。

## 第2段階の実機確認手順

1. checkoutを解除し、必要な変更を保存してからStudioフロントエンドを更新する。
2. 正式MCP exeを更新し、Codexを再起動／MCPへ再接続する。
   `tools/list`で8つの更新ツールの`checkoutId`必須化を確認する。
3. 現在の`list_development_sessions`からsessionIdを取得し、最新revisionを参照する。
   checkoutせず参照・選択が可能なことと、更新が拒否されることを確認する。
4. checkoutし、`editingLocked: true`を確認する。
   要素ダイアログを開いて入力・Cancel可能、Create/Update不可を確認する。
5. Disable/Enable・並び替え・追加/削除・リファクタリング・Undo/Redo・履歴復元を試し、変更とrevision増加が起きないことを確認する。
   ツリー開閉・選択・Criteria変更は可能であることを確認する。
6. 正しいcheckoutId/revisionでMCP更新を行い、リアルタイムUI反映を確認する。
   IDなし・別ID・古いrevisionでは変更されないことを確認する。
7. checkinまたは手動解除後に通常のユーザー編集が再開できること、古いIDでMCP更新できないことを確認する。
8. checkout中のMCP停止・Close・Restart拒否が継続していることと、日英メッセージを確認する。

第2段階時点ではcheckin後のダイアログ自動終了と1作業単位のUndoは未実装だった。
ダイアログ自動終了は第3段階で追加。1作業単位のUndoは第5段階で対応する。
第2段階時点ではrollbackは未実装。第4段階から`cancel_edit_session`で取り消せる。手動解除は引き続き変更を保持する（取り消しではない）。

## 第3段階の要素ダイアログ終了制御

- MCPチェックインとバッジからの手動解除は`McpEditSessionController`の共通終了処理を使用する。
- 正常終了時は、checkoutの所有権を検証・解除した後、要素ダイアログを直接閉じる。
  - Create/Updateのどちらでも未確定draftを破棄し、要素更新・追加・自動保存は行わない。
  - 破棄確認は出さない。ダイアログ入力・選択タブ等の一時状態もクリアする。
  - Svelteの画面更新を待ってからロケールに応じた作業完了通知を表示する。
  - 手動解除は「編集セッションを解除しました」の通知を表示する（作業完了とは区別する）。
- 通知のOKを待たず、MCPに終了結果を返す。revision/TreeStore/Undo履歴はこの終了処理では変えない。
- 不正なID、古いrevisionなどでチェックインが拒否された場合、ダイアログとdraftは保持する。
  手動解除のCancelや、確認中に別checkoutへ切り替わった場合も保持する。
- 非同期preflightから戻った際にダイアログのセッション同一性を再検証し、閉じた/開き直したダイアログの古い入力を適用しない。
- 参照操作やcheckout開始だけではダイアログを閉じない。セッションresetも作業完了とは扱わない。

## 第3段階の実機確認手順

1. 必要な変更を保存したうえでStudioフロントエンドを更新する。MCP再ビルド・Codex再起動は不要。
2. 最新のセッション一覧とrevisionを取得してcheckoutする。
3. 要素ダイアログを開き、確認用の未確定入力を作る。Update不可、入力/Cancel可能は維持される。
4. MCPから正しいID/revisionでcheckinする。
   ダイアログが自動で閉じた後に完了通知が表示され、MCP応答がOKクリックを待たないことを確認する。
5. 要素ダイアログを開き直し、未確定入力が適用されていないこと、revision/dirtyが増えていないことを確認する。
6. 同様にCreateダイアログ、ダイアログなしのcheckin、バッジからの手動解除を確認する。
7. 不正なcheckoutId/古いrevisionのcheckinと手動解除のCancelでは、ダイアログと入力が残ることを確認する。
8. 日本語/英語の通知と、終了後にユーザー編集が再開できることを確認する。

自動検証ではCreate/Updateの破棄、通知順序、OKを待たない応答、拒否時のdraft維持、手動解除の所有権競合、日英通知、古い非同期セッションの失効を確認した。

## 第4段階のcheckpointとrollback

- checkoutのロックを先に取得し、その時点のtree（開閉・Disableを含む）、選択node ID、CriteriaをRustメモリへ退避する。
  - JSONはTauriへの受け渡し時だけ生成し、専用checkpointの正本はRustに保持する。通常Undoをpopして代用しない。
  - 保存成功後にcheckout応答と`rollbackAvailable: true`を返す。失敗時は編集せず開始を取り消し、`CHECKPOINT_FAILED`を返す。
  - snapshot上限は既存履歴と同じ32 MiB。開始前のUndo/Redo baselineはArcで文字列を共有して保持するため、履歴全体を複製しない。編集中の通常履歴が上限でtrimされてもbaselineは失われない。
- `cancel_edit_session(sessionId, checkoutId, expectedRevision)`を追加する。
  - 現在の所有権とrevisionを検証し、checkpointを読み出した後にも適用直前に再検証する。
  - 元のtreeと操作状態をライブUIへ1トランザクションで復元する。revisionは現在値から1増加し、開始時の値へ戻さない。変更なしのcancelも復元revisionを発行する。
  - 開始前のUndo/Redo履歴と履歴一覧を復元し、途中のエージェント編集を除去する。通常Redo/履歴復元で取り消した作業を再適用しない。元から存在したRedoは保持する。
  - すべて成功した後だけロックを解除し、要素ダイアログのdraftを破棄して閉じ、日英の取り消し通知を出す。通知のOKは待たない。
  - 応答には`rolledBack: true`と復元後revisionを含む。
- 第4段階のcheckinとバッジの手動解除は変更を保持してcheckpointだけを破棄する。第5段階では正常終了のUndoグループ化とUIのrollback選択を追加する。
- 状態取得の`operation`は通常`null`、非同期遷移中は`preparing`/`checking_in`/`rolling_back`。
  - 遷移中の更新・checkin・cancel・UI解除を拒否/抑止する。参照と選択・開閉は引き続き許可する。
  - `EDIT_OPERATION_IN_PROGRESS`なら状態を再取得し、終了後に最新revisionで再試行する。
- `CHECKPOINT_UNAVAILABLE`は復元可能なcheckpointがない場合。`ROLLBACK_FAILED`は復元未完了を示す。
  - 復元失敗時はロックとcheckpointを維持し、完了通知やdraft破棄はしない。
  - tree復元後の履歴確定に失敗するとrevisionはすでに進んでいるため、必ず状態・revisionを読み直してからcancelを再試行する。
  - checkinのcheckpoint破棄失敗もロックを維持する。
  - バッジからの手動解除で失敗した場合もdraftを維持し、ロケールに応じた失敗トーストを表示する。
- 自動保存もディスク上のファイルの巻き戻しも行わない。編集中に手動保存したファイルはcancelでは戻らない。dirtyは現在の保存済みfingerprintとの差から再計算される。
- Studio終了時にcheckpointは消失する。第4段階の開発セッションresetは変更を保持してcheckpointを破棄していた。第5段階では公開セッションのreset/消失でcheckpointとロックを保持し、明示的な復旧選択を待つ。

## 第4段階の実機確認手順

1. checkoutを終了し、必要な変更を保存してからStudioをRust側も含め再ビルド・再起動する。フロントエンドの更新だけでは新しいTauri commandは使えない。
2. 利用側MCPを無効化しstdioプロセスを停止して、候補exeを正式な`apps/mcp/target/release/mebaco-mcp.exe`へ反映する。Codexを再起動/再接続し、`cancel_edit_session`を含む29ツールを確認する。
3. StudioでMCPを公開し、最新のセッション一覧とrevisionを取得する。以降、以前のIDは流用しない。
4. 開始前の選択・開閉・Criteria・dirtyを確認し、checkoutで`rollbackAvailable: true`を確認する。
5. MCPでDisable/Enableやプロパティ更新を複数回行い、各更新がリアルタイムで反映されることを確認する。必要なら選択・Criteriaも移動し、要素ダイアログに未確定入力を作る。
6. 古いrevision/別checkoutIdのcancelが拒否され、treeとdraftが維持されることを確認する。
7. 最新revision/正しいcheckoutIdでcancelする。開始時の内容・選択・開閉・Criteriaの復元、revision +1、ロック解除、draft終了後の取り消し通知を確認する。
8. Redoで取り消した作業が戻らないこと、開始前の人間の編集はUndo可能なことを確認する。正常checkinは変更を保持することも確認する。
9. 必要に応じて日英の通知と、変更なしのcancel、終了後のユーザー編集再開を確認する。

自動検証ではnative退避失敗、復元読出し失敗、履歴確定失敗後の最新revisionでの再試行、二重非同期操作の拒否、誤ID/古revisionの拒否、開始前履歴保持、日英通知とOK非待機を確認した。

## 第5段階の履歴グループ化と中断復旧

- エージェントの1 checkoutを1作業とする。
  - 各保存対象編集はその都度UIへ反映し、revisionを増加する。サンドボックスや一括適用へ変更しない。
  - 編集中は中間状態のUndo用JSONをserialize/送信/蓄積しない。Rustの開始時checkpointを正常終了時にUndoへ1件登録する。
  - 履歴一覧も現在の作業を1つの`Agent work`として更新する。中間ツリーsnapshotを積み増さず、終了後も中間revisionを履歴復元対象にしない。
  - checkinとUIの「編集内容を維持して終了」は同じ履歴確定経路を使用する。終了だけではrevisionは進まない。
  - Ctrl+Z 1回で開始時のツリー/選択/開閉/Criteriaを復元する。Ctrl+YでUndo直前の状態を復元する。Undo/Redoはいずれも新しいrevisionを発行し、過去の番号には戻さない。
  - 開始前の人間のUndo履歴を保持する。保存対象の編集が1回以上commitされた作業は、結果的に同じ内容へ戻っていても1作業として登録する。
  - dryRun、no-op、参照/選択/開閉だけの作業は履歴を増やさず、開始前のRedoも保持する。保存対象の編集があった作業を保持して終了すると旧Redoを消去する。
  - cancel/rollbackは開始前のUndo/Redoを復元し、取り消した作業を履歴から除去する。rollback確定失敗後に「保持」を選んだ場合も、過去の途中状態ではなく現在の最終状態だけを残す。
- native確定APIを`edit_history_commit_checkpoint(checkoutId, changed)`として追加した。
  - 新フロントエンド/旧Rustの組み合わせで、このAPIがない場合はチェックインを拒否しロック/checkpointを維持する。未知の追加引数が無視されてUndo履歴が失われる設計にはしない。
  - Undo/Redo用snapshotと専用checkpointは引き続きRustメモリ。通常履歴の件数/バイト上限は確定時にも適用する。画面の履歴一覧は既存のフロントエンド側ログを使用する。
- 公開セッションの変更/消失を通知されたら`recoveryRequired: true`にする。
  - checkout ID/元session ID/checkpointとユーザー編集ロックを保持し、自動checkin/rollbackはしない。
  - 状態応答の`sessionId`はcheckoutの所有セッション、`publishedSessionId`は今回参照している公開セッションを示す。所有権を新セッションへ自動移管しない。
  - 通常のエージェント更新/終了は`EDIT_SESSION_RECOVERY_REQUIRED`で拒否する（IDが異なる場合はMISMATCH）。ユーザーの明示的なUI操作でのみ復旧終了できる。
  - MCP公開状態がstoppedでも同じバッジを残し、「エージェント編集の復旧待ち」と表示する。別バッジは追加しない。
  - バッジのダイアログで「編集内容を維持して終了」「開始時へ戻して終了」を選ぶ。Cancelはロック・draftを維持する。処理失敗時もロックを維持する。
  - 元と異なるcheckoutに切り替わった後の古い確認ダイアログでは、新しい作業を終了しない。native処理中の二重終了も拒否する。
  - 復旧待ちのままMCP公開を再起動しない。まず明示的に終了する。終了後にMCP公開を再開し、新しい一覧からセッションを取得してcheckoutする。
- エージェント/stdioクライアントの終了だけを、Studioは自動検出しない。
  - ユーザーへの確認待ち・長時間処理とクラッシュを区別できないため、無通信タイムアウトで勝手に終了しない。
  - Codex再起動やエージェント中断でcheckoutが残った場合は、ユーザーがエージェントを停止したうえで同じバッジから復旧する。
  - Studioプロセス終了/WebView再ロード後の復旧やディスク保存の巻き戻しは対象外。自動保存は行わない。

## 第5段階の実機確認手順

1. checkoutを終了し、必要な変更を保存してから、StudioをRust側も含め再ビルド・再起動する。
2. MCPを無効化・stdio停止後に候補exeを正式exeへ反映し、Codexへ再接続する。ツール数は29のまま。
3. Studioで公開し、最新一覧/現在revisionを取得する。開始前の内容・選択・開閉・Criteriaを確認する。
4. checkoutし、App/Tag作成・Disable・プロパティ編集など複数回の更新を行う。各更新のライブ反映とrevision増加を確認し、checkinする。
5. Ctrl+Z 1回で開始時にまとめて戻り、Ctrl+Y 1回で最終状態へ戻ることを確認する。開始前に人間の編集があれば、さらにUndoしてその操作へ戻れることも確認する。
6. 参照/選択だけでcheckout→checkinし、不要なUndo履歴が増えないことを確認する。
7. checkout→複数編集後、エージェントを中断する。バッジから保持を選び、1回Undo可能なことを確認する。
8. 同様にバッジからrollbackを選び、内容と操作状態の復元・ロック解除・取り消し通知・Redoで途中作業が復活しないことを確認する。
9. 確認ダイアログのCancel、要素ダイアログの終了、日英表示を確認する。通常のMCP停止・Close・Restartはcheckout中引き続き拒否される。

公開セッション消失通知・新セッションへの所有権非移管・旧native API未反映・復旧失敗と競合は自動テストで確認する。実機でプロセスを強制終了して消失を作る必要はない。
