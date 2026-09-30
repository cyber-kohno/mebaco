---
title: StateとAction
description: Stateを宣言し、イベントに応じて画面の値を更新します。
---

Store内にStateを定義し、Textなどの式から値を読み、ButtonなどのイベントにActionを接続して更新する流れを扱います。ActionとFunction、Effect、Transitionの役割は混同しやすいため、最小例と使い分けを示します。

```text
Button click → Action → State更新 → Runtimeが再描画
```

コード例、型、更新可能な条件、非同期処理、エラー時の挙動は初版実装に合わせて追記します。
