---
title: 要素一覧と仕様台帳
description: Studioに登録されている全Element kindと文書化の対象を管理します。
---

import ElementCatalog from '../../../components/ElementCatalog.astro';

<span class="doc-status">82種類をRegistry照合対象として登録</span>

## 台帳について

要素一覧はStudioの `ElementRegistry` と `element-catalog.mjs` を照合します。新要素の登録、名称変更、廃止があれば、カタログの差分が明らかになります。現在は分野別の索引を用意した段階です。初版公開時には各要素の設定・制約・動作を実装と照合した個別仕様へ展開します。

<ElementCatalog />
