# Studio / MCP通信世代管理：現状と導入計画

作成日: 2026-10-17。状態: 調査・計画。通信世代の実装、ビルド、実機接続試験、稼働中アプリの入替は未実施。

**進捗追記:** 工程1〜4を実装し、自動検証を進めた。実装後の状態・確認結果・残る実機確認は
[MCP_BRIDGE_GENERATION_IMPLEMENTATION.md](MCP_BRIDGE_GENERATION_IMPLEMENTATION.md)を参照。
以下は調査時点の現状と採用した導入計画の記録。

## 1. 結論

trace_kernelと同じく、StudioとMCPアダプターがそれぞれビルド時に持つ **`bridgeProtocolGen`の完全一致だけ**を接続互換性の条件にする。初期世代は1を提案する。

製品バージョン、既存のAPI世代・Schema世代、固定ResourceのmodelVersion、標準MCPのprotocolVersionは、それぞれ用途を維持する。MCP接続の追加条件にはしない。

MCP側で各操作の直前に認証付きhealthを確認し、Studio側でも全bridge要求を処理前に検査する。片側だけの検査では、旧MCPから新Studioへの要求や、事前確認後の接続先変化を防げない。

実装は「共通契約・ビルド情報 → 両側の通信検査と内部probe → 診断表示 → 組み合わせ検証・初回移行」の順で進める。初回は世代情報を持つStudio/MCPの両方へ入れ替える。

## 2. mebacoの現状

### 通信経路と保護

```text
AIクライアント
  → stdio / 標準MCP
  → code/apps/mcp（mebaco-mcp.exe）
  → セッションdescriptorを発見・認証付きGET /health
  → 認証付きPOST /bridge（IPv4 loopback）
  → Studio / Tauri Rust
  → pending登録・mebaco://mcp/request
  → WebView / McpToolHandler
  → TreeStore・編集セッション・Runtime Preview
  → mcp_respond / HTTP応答
```

| 項目 | 実装から確認した状態 | 世代管理に必要な変更 |
|---|---|---|
| セッション公開 | Studioの`src-tauri/src/mcp/session.rs`がUUID、PID、endpoint、token、projectDisplayName、dirty、作成時刻をdescriptorへ保存 | Studioのcontractと診断用identityを追加 |
| 発見 | MCPの`src/bridge/session.rs`がファイル名とsessionId、PID、IPv4 loopback、64桁hex token等を検査 | 既存検査を残し、到達可能な非互換相手を理由付きで返す |
| health | HTTP 200、JSONの`ok=true`、sessionId一致を確認済み。現状は汎用JSONとして解析 | 専用DTOで解析し、contract検査を追加。trace_kernel導入前の文字列部分一致方式とは異なる |
| 操作直前の確認 | `call_development_session`が対象descriptorを読み直し、healthを再確認する | この既存の入口に世代判定を集約する |
| bridge要求 | `{method, params}`だけ。Studioの`IncomingRequest`にも世代・対象sessionIdがない | `{method, params, sessionId, contract}`へ拡張 |
| Studio受付 | 認証後、JSON解析→pending登録→WebViewへevent。世代検査なし | pending登録・event発行より前に世代とsessionIdを検査 |
| bridgeエラー | code/messageとexpectedRevision/actualRevisionを持つ。MCP側で必要項目を再構成 | 互換性エラーの双方のcontractを欠落させず伝える |
| 公開一覧 | 公開DTOはtoken/endpointを含まない。検査失敗した相手は一覧から除外 | token非公開を維持し、status/compatible/理由/contractを追加。endpointの公開は不要 |
| Studio内部probe | `mcp_probe_session`が`POST /bridge`でpingを送る。要求は旧形式の固定bytes | 共通DTOで自身のcontractと対象sessionIdを付ける。更新漏れでStudioの公開開始が失敗する |
| UI状態 | stopped/starting/available/connected/stopping/error。handlerがavailable時の要求受付でconnectedへ変更 | 公開状態と要求受付履歴を区別し、世代拒否を全体の停止・errorにしない |
| 固定解説 | `resources.rs`で3 Resourceを埋込。metadataの`mebaco/modelVersion`は`"1"` | 解説の対象MCP通信世代を本文・metadataへ付ける |
| ツール | 現在29。参照・選択・式検証・編集checkout/checkin/cancel・8種の内容更新・Preview等 | すべてのStudio宛て要求を共通の世代検査対象にする |

descriptorの格納先はアプリデータ下の`com.mebaco.studio/mcp/sessions`。内容は認証情報を含む内部情報であり、今後もMCP結果・ログ・UIにそのまま出さない。

### 既存の識別番号

| 情報 | 現在値・定義 | 用途・注意 |
|---|---|---|
| Studio製品version | `0.1.0`。Studio package.json / Cargo.toml / tauri.conf.json / `src/system/version.ts`のAPP_VERSION | 現在の値は揃っているが、手書きの別定義で同期を強制する仕組みがない |
| MCP製品version | Cargo.tomlの`0.1.0`。標準serverInfoは`CARGO_PKG_VERSION` | Studioとの比較・共通release情報はない |
| API_GEN | `version.ts`の数値`1` | `.mbc`と配布パッケージの検査にも使用。MCP用に意味を変えない |
| SCHEMA_GEN | `version.ts`の数値`1` | 保存形式・配布パッケージの検査にも使用。今回のために上げない |
| modelVersion | 固定Resource本文・metadataの文字列`"1"` | 資料の識別情報。Studioとの接続契約ではない |
| 標準MCP protocolVersion | server設定で`2024-11-05` | AIクライアント⇔MCPの規約。Studio⇔MCPの通信世代とは別 |

`version.ts`のexportはwindow title、開始画面、project-file、release-package、client-packageから参照される。識別情報の整理で既存の公開exportや数値型を壊さない。

### 現状の不整合リスクと維持する保護

- 新旧の組み合わせでも認証とhealthが通れば操作を送れる。未知methodのエラーだけでは、同名methodの引数・応答・意味の変更や、古い解説による誤用を防げない。
- 世代をhealthだけに載せても、旧MCPは無視してPOSTできる。Studio側の強制検査が必要。
- healthとPOSTは別接続であり、bridge要求自体にも対象sessionIdを載せて受付側で照合する。
- 現状の発見失敗は一覧から消え、直接呼出も`SESSION_NOT_AVAILABLE`に集約されるため、非互換と未起動を区別できない。
- checkoutId・expectedRevision・dryRun・編集ロック・checkpoint/rollback・Undoグループ・中断復旧は、操作の権限と状態整合性の保護。通信世代の一致後も必須とする。
- Previewの所有権、revision、要素ID、実行制限・終了処理も維持する。内容更新以外の要求にも世代検査が必要。

通信上の関連事項として、Studioはheader 16 KiB/body 64 KiB、read timeout 2秒、WebView応答待ち5秒で、接続処理は直列。MCPはhealthのconnect/read各500 ms、bridgeのconnect 2秒/read 7秒で、応答を切断まで読む。MCP側のdescriptor/応答サイズ上限、write timeout、操作全体の絶対deadlineは明示されていない。世代情報の追加と併せて読み取りを有界化するが、trace_kernelの容量・待ち時間・並列化をそのまま移植しない。

## 3. trace_kernelから採用する方針と差分

参照元は`C:/app/git/trace_kernel`の実ソースと開発記録。主な参照先:

- [全体計画46](../../trace_kernel/ai_context/develop/task/2_runtime_foundation/46_DesktopとMCPの互換性整備計画.md)
- [共通契約](../../trace_kernel/code/crates/mcp-protocol/src/lib.rs)
- [MCP側のprobe・呼出](../../trace_kernel/code/apps/mcp/src/bridge.rs)
- [アプリ側の受付](../../trace_kernel/code/crates/native-core/src/mcp.rs)
- [release運用と検査](../../trace_kernel/code/release/README.md)
- [通信検査の記録48](../../trace_kernel/ai_context/develop/task/2_runtime_foundation/48_DesktopとMCPの通信世代検査と接続保護.md)
- [診断UIの後続整理51](../../trace_kernel/ai_context/develop/task/2_runtime_foundation/51_MCPミニウィンドウの小型化と診断分離.md)

採用する内容:

1. `BridgeContract`を世代だけの接続判定入力とし、製品情報と分離する。
2. 正の整数の完全一致。欠落・null・型不正・0・別世代は拒否し、範囲指定・旧形式fallbackは設けない。
3. 認証付きhealthを相手の契約の正本とする。descriptorは候補情報であり、contractが記載されていればhealthとの一致を検査する。
4. MCPは操作ごとに対象を再確認し、非互換ならPOSTを送らない。Studioは全要求を副作用発生前に拒否する。
5. 到達可能な非互換相手を一覧へ残し、安定したcodeと双方の世代、対処方法を伝える。
6. 軽量な共通Rust crateにDTO・判定を置き、単一のrelease定義から両アプリとFrontendへビルド情報を供給する。
7. 世代の更新規則、manifest同期検査、両アプリの組み合わせ検証、プロセス再起動を含む移行を整える。

mebaco向けの調整:

- trace_kernelのnative-core/V8/Work/Workspace固有構成は持ち込まず、Studioの既存`mcp`モジュールに適用する。
- mebacoのPID検査・ファイル名照合・token形式検査・公開DTOの非公開項目を維持する。
- API/Schemaの値は既存`version.ts`から取得する。trace_kernelのWorkspace世代や文字列型を新設しない。
- mebaco固有の編集セッション・中断復旧・Previewを契約と回帰検証に含める。
- 診断UIは現状の小さなバッジを起点にする。trace_kernelの途中段階の大きなpopoverを複製せず、詳細は別ダイアログ等へ分ける。

trace_kernelも自動試験と一部実接続の記録に加え、実GUI・実ライセンス・社内移行の残項目を明示している。先行製品の全工程が完了した前提では扱わない。

## 4. 提案する契約・管理規則

### 正本とビルド情報

新規`code/release/studio-mcp.json`をStudio/MCPのrelease情報の正本とする。

```json
{
  "formatVersion": 1,
  "releaseVersion": "0.1.0",
  "bridgeProtocolGen": 1
}
```

`releaseVersion`の上記値は現状ベースライン例であり、新版の配布番号の確定ではない。配布済みの同一versionを別内容で上書きせず、初回配布時に製品versionを更新する。接続互換性の初期値は`bridgeProtocolGen=1`とする。

- `formatVersion`はこの管理ファイルの形式。通信判定に使わない。
- `ProductIdentity`はreleaseVersion、bridgeProtocolGen、診断用apiGen/schemaGenを持つ。`BridgeContract`はbridgeProtocolGenだけを持つ。
- API_GEN/SCHEMA_GENは現在の定義と数値型を維持し、Rust/Node helperが限定した定数形式を検証して読む。別の手書き定数を増やさない。
- APP_VERSIONと新しいMCP世代は正本からFrontendへ供給し、既存`version.ts`のexport名を維持する。Vite/Vitest双方で同じ生成情報を解決できるようにする。
- Rustは両アプリのbuild.rsで共通helperを使用し、ビルド時に値を埋め込む。MCP単独ビルドにNode起動、Studio build、Tauri依存を要求しない。
- Cargo/npm/Tauriに必要なversion宣言は正本の鏡像として同期・検査する。関係するnpm lockfileと両Cargo.lockを確認する。ルートnpmやHomepageの製品versionを一律同期する対象にはしない。
- ViteのFrontend buildがidentityを出力し、StudioのRust release buildが一致を検査する。dev時はmetadata変更による再起動とRust再ビルドが必要。これは組立情報の一致検査であり、全assetの内容を証明する仕組みではない。
- MCPに`--version`/`--version-json`とpingのidentity、Studioに安全な製品情報取得IPCを追加する。引数なしのstdio起動を維持する。

共通crate案は`code/crates/mcp-protocol`。serde/serde_json程度の依存に留め、ファイル探索・HTTP・Tauri・WebView・編集状態を持たせない。世代値の正本はJSONだけとし、crate内に現在値1を重複定義しない。

### wire形式・拒否順序

新しいbridge要求の例:

```json
{
  "sessionId": "<full-session-id>",
  "contract": { "bridgeProtocolGen": 1 },
  "method": "getProjectOverview",
  "params": {}
}
```

- descriptorと認証付きhealthにはStudioのcontractとidentityを追加する。identityの欠落・拡張・製品version差は接続拒否の条件にしない。
- Studioは「既存のサイズ等の検査 → 認証 → JSON envelope解析 → contract形式・世代一致 → sessionId一致 → pending登録・event送信」の順で処理する。
- 世代情報のない旧要求も互換性エラーに分類する。解析用DTOで欠落を受け止めることと、欠落を許可することを混同しない。
- 互換性エラーはHTTP 409、既存の`ok=false/error.code/error.message`に双方のcontractを追加する。不正JSON等の既存400、認証失敗401、method処理の既存エラーとの区別を維持する。
- code例は`MCP_CONTRACT_REQUIRED`、`MCP_CONTRACT_INVALID`、`MCP_BRIDGE_GENERATION_INVALID`、`MCP_BRIDGE_GENERATION_MISMATCH`。対象sessionId不一致も専用codeで処理前に拒否する。
- 相手世代を解釈できない場合は不明とし、生の不正入力・token・params・ソースをエラーへ展開しない。詳細な世代情報や拒否履歴は認証後に限る。
- `expectedContract`は拒否を判定した側の世代、`actualContract`は確認できた相手世代。UIではStudio/MCPのどちらかを明確にして表示する。
- MCPの`BridgeCallError`を拡張し、既存のrevision情報と新しいcontract情報の両方を保持する。汎用的な「セッションなし」へ置き換えない。

一覧は既存の`{sessions:[...]}`と既存の表示情報・並び順を維持し、各sessionに`status`、`compatible`、Studio/MCPのcontract、任意のidentity/errorを追加する。statusは`compatible / incompatible / legacy / invalid / unavailable`を基本とする。破損して識別不能なファイルは除外し、識別可能な相手の非互換と到達不能は区別する。操作可能な対象は`compatible=true`だけとする。

### 世代を上げる変更

通信世代はbridgeのJSON形式だけでなく、MCPが案内・利用する契約全体を表す。

| 変更 | bridgeProtocolGen |
|---|---|
| tool/resource/methodの追加・削除、引数・応答・エラー契約の変更 | 上げる。後方互換な追加も対象 |
| Kind schema、更新operation、要素・式・Style・Retention等のMCP公開仕様の変更 | 上げる |
| checkout/checkin/cancel、dryRun、revision、復旧、Preview等の意味・利用条件の変更 | 上げる |
| 内蔵解説が案内する仕様・APIの変更 | 上げる |
| API_GEN変更がMCPへ公開する契約にも反映される | 上げる。API_GEN自体を接続キーにはしない |
| GUIの見た目だけ、契約を変えない内部整理、既存契約へ戻す障害修正 | 維持 |
| 解説の誤字・表現だけの修正 | 維持。説明する仕様を変えた場合は上げる |

実行時のKind capabilitiesや操作可能性は、世代一致後にもlive情報で確認する。世代値は更新漏れを自動発見できないため、リリース時の契約差分レビューと回帰検査を併用する。Git hash・時刻・dirty状態から世代を自動算出しない。別のreleaseIdや世代交渉は設けない。

## 5. 導入工程と完了条件

| 工程 | 実施内容・主な対象 | 完了条件 |
|---|---|---|
| 1. 共通契約とビルド情報 | 新規`code/release/`と`code/crates/mcp-protocol/`、両Cargo.toml/build.rs、Studioのversion.ts/Vite/関連manifest。ProductIdentity・BridgeContract・純粋判定・同期検査を整備 | 同じソースから両アプリ/Frontendの情報を取得できる。単独MCP buildが成立し、不正値・古いmanifest・Frontendのidentity不一致で検査が失敗する |
| 2. 両側の通信検査 | Studioの`mcp/session.rs`・`server.rs`、MCPの`bridge/session.rs`、必要なbridge error型。descriptor/health/全要求に適用。Studio内部probeも更新 | 新MCP→旧StudioはPOST 0回。旧MCP→新Studioはpending/event 0回。世代不一致・sessionIdずれを両側で拒否。同世代の製品version差は許可 |
| 3. 解説と診断UI | MCPのresources/server instructions/ping、Studio開始画面・バッジ・詳細表示・Tauri IPC・日英文言 | 双方の世代と理由・更新/再起動方法が分かる。固定解説は未接続でも取得可能。公開と外部要求受付を区別する |
| 4. 自動検証の統合 | 共通Rust、両アプリRust、Vitest、stdio smoke、隔離bridge/プロセスfixtureと検証入口 | 下記の組み合わせ・副作用なし・既存操作回帰を確認し、両アプリを一つの入口から検証できる |
| 5. 実機確認と初回移行 | 専用テストプロジェクトで実Studio/実MCPを確認し、入替・再接続手順を記録 | 世代表示・参照・編集終了/復旧・Preview・不一致診断を確認。未確認項目は明示し、移行完了と区別する |

工程2のMCP側とStudio側は一つの変更単位として整える。途中の片側だけを互換性対応済み製品として配布しない。工程1だけでは通信保護は有効にならない。

工程2で共通化するのは通信契約と判定であり、Studioの編集実装をMCPへ移植しない。既存受付処理を小さなhost adapter/event sinkに分ければ、Tauri実ウィンドウに依存せず、実際の受付コードに対してpending未登録・event未発行を試験できる。

通信読込の有界化も工程2で扱う。descriptor/header/bodyの容量、送信・受信の絶対deadline、HTTP statusとContent-Lengthを検査し、切断まで無制限に読まない。具体的な上限は既存の最大応答とPreviewの制限から決める。直列受付・停止/join・既存5秒/7秒の待ち時間を不用意に変えず、停止処理の全面改修や並列化は本計画に含めない。

診断はセッション単位の件数と直近の拒否理由を必要最小限で保持し、履歴件数に上限を設ける。認証失敗・内部probe・healthを外部MCPとの接続確認として数えない。MCP側が事前拒否してPOSTしなかったものをStudio側で観測したように表示しない。診断取得はpending/eventの業務処理経路と分ける。一つの相手の拒否で公開全体を停止しない。

## 6. 検証計画

### 組み合わせ・拒否位置

| ケース | 期待結果 |
|---|---|
| 同世代、同version | 発見・参照・式検証・編集・Previewが成功 |
| 同世代、製品version違い | 許可。片側だけのGUI修正などで不要な更新を要求しない |
| 異世代、製品versionは同じ | 拒否し双方の世代を提示 |
| 新MCP→旧Studio | legacyと理由を一覧に残す。bridge POSTは送らない |
| 旧MCP形式→新Studio | HTTP 409。pending/event、TreeStore変更、checkout、Preview開始なし |
| contract/世代の欠落、null、不正型、0、範囲外 | 拒否。互換性を推測しない |
| descriptorとhealthのsessionId/記載contractが不一致 | invalidとして操作しない |
| descriptorにcontractなし、認証付きhealthは有効な同世代 | healthを正本として許可 |
| health確認後に世代/sessionIdが変化した要求 | Studioが処理前に拒否。MCP側へ専用理由を保持 |
| 互換・非互換セッションが同時公開 | sessionごとに判定し、互換な相手は利用可能 |
| identityの診断項目差・追加・欠落 | それだけでは拒否しない |
| API/Schema値違い、MCP世代同じという純粋判定fixture | 判定は許可。実製品の契約変更時の世代更新責務と混同しない |
| 認証失敗・到達不能・不正HTTP/JSON・過大応答・遅延 | 非互換と区別し、有界時間・容量で終了。秘密情報を出さない |
| Studio内部probe・dirty同期・停止/再公開 | 公開開始成功、新規sessionId・descriptor更新・診断リセットを確認 |

### 既存機能の回帰

- 参照・選択・式検証・Previewはcheckout不要、8種の内容更新はdryRunでもcheckoutId/expectedRevision必須という現状を維持する。
- checkout、複数更新、checkin後の1回Undo/Redo、cancelによるrollbackとrevision更新、手動解除後の旧ID拒否を確認する。
- 公開喪失時の編集ロック/checkpoint保持と手動復旧を確認する。互換性拒否を理由に勝手にcheckout解除やrollbackをしない。
- Previewの起動・検査・操作・終了、stale/closed ID、実行エラー、保存先や外部I/Oの既存制限を確認する。
- Studio単体の編集・保存・`.mbc`再読込・パッケージrelease/client読込を維持する。API/Schemaの意味を変えない。

### 検証入口

既存の入口はStudioの`npm run check`/`npm test`/build、各Cargo test、MCPの`code/apps/mcp/scripts/verify-stdio.mjs`、Studioの`code/apps/studio/scripts/test-mcp-preview.mjs`。現状のstdio smokeは29ツールとcheckout引数の検査が中心であり、世代の実接続試験にはならない。

導入時に`code/release/check-studio-mcp-suite.mjs`等を追加し、共通契約・release検査、両Rustアプリ、Studio型検査/Vitest/build、stdio初期化とping/Resource、隔離したbridgeの組み合わせ試験をまとめる。必要な既存toolchain/cacheを使い、検証のために依存versionを更新しない。

テストでは専用一時ディレクトリとダミーdescriptor/loopback hostを使用する。新旧の形式はfixtureで再現し、実行中のユーザープロジェクトやMCP設定を使わない。実機の編集・Preview試験は専用プロジェクトで実施し、自動試験成功と実Tauri GUIの確認を別々に記録する。

## 7. 初回移行と対象外

初回移行の順序:

1. 進行中の編集をcheckin/cancelまたはStudioの手動復旧で完了させる。保存が必要な内容を保存する。checkpointはStudioプロセス終了を越えて残らない。
2. Studioの公開を停止し、利用側AIクライアントのMCP接続を無効化してstdioプロセスを停止する。Studioの`mcp stop`だけでは外部MCPプロセスは終了しない。
3. 通信世代1のStudioとMCPを両方更新する。設定済みの実行ファイルpathを確認する。現在の正規MCP pathは既存手順の`code/apps/mcp/target/release/mebaco-mcp.exe`を基準に確認し、候補ビルドと取り違えない。
4. StudioとMCP接続を再起動し、必要に応じAIクライアントのツール情報を再読込する。
5. 最新一覧の完全なsessionId、compatible、双方の世代を確認し、参照から開始する。更新前のsessionId/checkoutId/previewIdを流用しない。

以後はMCP通信世代が同じなら製品versionが違っていても接続できる。世代を上げた場合は対応する両側を更新する。新しい検査で過去の旧Studio/旧MCP同士を保護することはできない。

本計画の対象外はHomepage変更、MCP同梱やinstaller/ZIP/署名/自動更新、外部公開、標準MCP SDK更新、API/Schemaの値・保存形式の移行、異世代交渉・旧形式fallback。入替作業を実装に伴って自動実行することも対象外とする。

## 8. 着手時に確定する実装詳細

本計画では、接続条件・初期世代・拒否方針・工程・完了条件までを提案として整理した。次は工程1から実装する。

実装時には、現在の配布状況に応じた初回releaseVersion、生成情報のVite/Vitestへの供給方法、manifest/lockfileの実際の管理範囲、有界読込の容量・deadline、診断の保持上限と既存バッジからの詳細導線を確定する。これらを決めるために通信世代だけで判定する基本方針を変更する必要はない。

この資料の「現状」はソースと既存資料の読取結果。既存テストの再実行や接続中Studioの確認を行った結果ではない。
