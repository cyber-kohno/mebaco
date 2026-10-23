# MCP通信世代管理の実装と実機確認

2026-10-17。[導入計画](MCP_BRIDGE_GENERATION_PLAN.md)の工程1〜4を実装した。
製品versionはStudio/MCPとも`0.1.1`、MCP通信世代は`1`。
既存API_GEN/SCHEMA_GENは数値`1`のまま。

## 実装内容

- 正本`code/release/studio-mcp.json`、軽量な共通契約crate、Node/Rust build helperと同期検査を追加。
  同じソースのmanifestやFrontend/Rustの組立情報のずれを検査し、別製品間の接続条件には使わない。
- descriptor/health/bridgeに通信契約を追加。MCPは操作直前に確認し、Studioは認証後・pending/event前に拒否する。
  全Studio宛て要求と内部probeを対象にし、対象sessionIdも照合する。
- 到達可能な旧版・異世代を理由付きで一覧に残す。互換性エラーと既存revisionエラーの情報を保持する。
  公開結果へtoken/endpointを含めない。
- bounded HTTPクライアントを別の`mcp-transport` crateへ分離。純粋契約crateへI/O依存を混ぜず、StudioのprobeとMCPで共有する。
- 固定解説、instructions、ping、version CLIへ対象世代・識別情報を追加。
- 開始画面にMCP世代、公開中のヘッダーに世代と診断導線を追加。詳細は別dialogで日英対応。
  「接続中」を過去の「要求受付済み」へ変更し、公開や自己probe成功を外部接続確認と混同しない。
  編集バッジの解除・復旧操作を維持する。
- 診断は認証済み要求の拒否を最大8グループで集約。停止/再公開で消去し、IPCの古い応答を無視する。

実装・運用の詳細と検査入口は[code/release/README](../code/release/README.md)。

## 自動検証と範囲

実施した検証と最終結果はこのファイル末尾の「確認結果」に記録する。
自動検証の対象は純粋判定、実際のStudio受付コードを使うloopback通信、実MCP stdioプロセス、
隔離した実hostプロセス、Studioの既存Vitest、ブラウザー内の実Svelte表示・Preview。

host fixtureは製品のHTTP受付・pending・応答型・診断をそのまま使用し、WebView event sinkだけをメモリーの応答へ置き換える。
そのため、世代拒否位置と実プロセス間通信の検証であり、実Tauri IPCや実TreeStoreの編集を確認した結果ではない。
編集・checkpoint・rollback等は既存Rust/Vitest回帰で検証し、実機での一連操作は以下に残す。

## 実機確認に使用する候補

- Studio debug: `code/apps/studio/src-tauri/target/debug/mebaco-studio.exe`。
  既存の開発方法でViteを`http://localhost:1420`へ起動し、更新したRustアプリを起動する。
  `pnpm tauri dev`等の既存の起動手順でもよい。ViteのHMRだけでは古いRustを更新できない。
- MCP release候補: `code/apps/mcp/target/next-release/release/mebaco-mcp.exe`。
  `--version-json`でversion `0.1.1`、bridgeProtocolGen `1`を確認する。
- 正式設定で使われている`code/apps/mcp/target/release/mebaco-mcp.exe`は差し替えていない。
  稼働中MCPの停止・クライアント設定変更・インストーラー作成・公開は未実施。

## 実機確認手順（工程5・未完了）

1. 実プロジェクトの進行中編集をcheckin/cancelまたは手動復旧で終了し、必要な変更を保存する。
   Studio終了でRustメモリーのcheckpointは失われるため、復旧待ちのまま更新しない。
2. 利用側AIクライアントでMCP接続を無効化し、stdioプロセスを終了する。
   Studioの`mcp stop`だけでは外部MCPは停止しない。
3. Studioを更新して再起動し、MCP候補を利用する。正式pathへ反映する場合はプロセス停止後に実施する。
   MCPを再有効化し、必要ならAIクライアントを再起動する。
4. Studioの開始画面でMebaco `0.1.1`とMCP `Gen 1`を確認する。
   専用テストプロジェクトを開いてMCPを公開し、診断画面が開くことを確認する。
5. 新しい一覧で対象sessionの`compatible=true`、双方の世代1を確認する。
   overview等の参照後、Studioの表示が「要求受付済み」となり、診断の受付数が増えることを確認する。
6. 専用プロジェクトでcheckout → 内容更新 → checkin → 1回Undo/Redoを確認する。
   別のcheckoutでは更新後cancelで戻ること、旧checkoutIdが使えないことを確認する。
   公開喪失後の手動復旧も既存手順で確認する。
7. 同プロジェクトでPreviewの開始・検査・操作・終了を確認する。
   保存対象や外部I/Oの既存制限、Preview終了後の通常編集を確認する。
8. 公開停止・再公開で新しいsessionIdとなり、診断の履歴が消えることを確認する。
   `.mbc`の保存・再読込と通常のStudio単体操作を確認する。
9. 必要な拒否表示は専用テストプロジェクトへ、世代欠落/異世代の参照要求を意図して送って確認する。
   旧正式MCP→新Studioは一覧だけでは拒否履歴が増えないため、旧形式の参照要求を1回呼ぶ。
   Studioに双方の世代/不明表示と再起動案内が出ることを確認し、その後同世代のMCPへ戻す。

拒否試験のためにcheckoutや更新を送る必要はない。世代検査は全method共通であり、更新拒否・副作用なしは自動fixtureで確認済み。
新MCP→旧StudioはMCP側の事前確認で止まり、Studioの拒否履歴には出ない。

## 確認結果

`node code/release/check-studio-mcp-suite.mjs --browser`の全21工程が成功。

- 共通契約Rust: 単体3件＋build helper2件成功。
- MCP Rust: 21件成功。実Studio受付コードを組み込んだloopback試験を含む。
- Studio Rust: 29件成功。既存の編集履歴・checkpoint・resource/storage等の回帰を含む。
- Node release検査: 3件成功。正本、manifestずれ、生成identity、監視を検査。
- Studio Vitest: 178 files / 1,061件成功。診断の古い応答破棄・停止・失敗復帰・日英表示を含む。
- Svelte/TS: 0 errors。既存のConfirmDialogLayer/CommandConsoleLayerのa11y警告2件は残る。
  Vite buildも成功。既存箇所のdynamic import/chunk size等の警告は残る。
- MCP実stdio: 初期化、29ツール、8更新ツールのcheckout条件、ping、3 Resource、identityと対象世代の一致を確認。
- 隔離した実プロセス: 同世代の製品version/API情報差を許可、混在session、旧healthへのPOSTなし、
  旧形式・異世代の直接要求の拒否と秘密情報を含まない公開結果を確認。
- headless Edge: 診断の8グループ表示・初期スクロール位置・小画面・Escape・更新・停止時消去を確認。
  既存Runtime Previewの変換/空欄/blur/textarea/focus/scroll/制限/revision/ID/error/終了試験も成功。
- Studio debug exeとMCP release候補のbuildが成功。release候補でもstdioと隔離実プロセス試験が成功。
- Rust format検査と`git diff --check`が成功。外部依存のversion更新は行っていない。

実Tauri・実利用側クライアントでの上記工程5は未確認。正式MCPの差し替え、稼働中プロセス停止、
設定変更、配布、commit/pushは行っていない。
