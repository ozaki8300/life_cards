# Share v3 User Flow Design

## Purpose

Share v3整理の目的は、共有ページの主役をImportではなく閲覧に戻すことです。

現在の共有 v2 では、同じ共有ページ内に以下の導線が混在しています。

- 送信者の画像あり/なし共有
- 未ログイン受信者の閲覧
- 未ログイン受信者のログイン誘導
- ログイン済み受信者のImport
- 画像あり/なし登録選択

Share v3 では、共有ページをまず「届いたLife Cardを見る場所」として設計し、登録/Importは閲覧後の次アクションとして分離します。

## Core Principles

- 閲覧はログイン不要にする。
- Life Cardsに取り込む時だけログインまたは登録が必要になる。
- 未ログインユーザーにImport選択肢を見せない。
- 既存ユーザーにだけImport選択肢を見せる。
- 画像あり/なしの選択は、送信者側とログイン済み受信者側でのみ扱う。
- QR、URL、`share_cards` row は1つのままにする。
- 受信側の表示と登録可否は `shareMode` で分岐する。

## Users

Share v3 では、ユーザーを以下の3種類に分けて導線を整理します。

1. 送信者
2. 未ログイン受信者
3. ログイン済み受信者

## Sender Flow

送信者は今まで通り1つの共有ボタンから共有を開始します。

共有モーダル内で共有方法を選択します。

- 画像ありで共有
- 画像なしで共有

共有リンク生成後も、QR、URL、`share_cards` row は1つだけです。共有ページ側は payload の `shareMode` によって表示を分岐します。

### Sender Requirements

- 共有ボタンは1つ。
- 共有モーダルで画像あり/画像なしを選ぶ。
- `shareMode === "withImage"` の場合、共有ページでは画像を表示できる。
- `shareMode === "textOnly"` の場合、共有ページでは default image を表示する。
- ログイン状態によってURLを分岐しない。
- QRを複数作らない。

## Signed-Out Recipient Flow

未ログイン受信者は `/share/[token]` でカードを閲覧できます。閲覧自体にログインは不要です。

表示は共有 payload の `shareMode` に従います。

- `shareMode === "withImage"`: 画像ありで表示する。
- `shareMode === "textOnly"`: default image で表示する。

未ログイン受信者には Import 選択肢を出しません。

出す導線は以下です。

- このカードを受け取りました
- Life Cardsを始める
- Life Cardsとは？

ここでは「Import」ではなく、Life Cardsを始めるための登録導線として扱います。

### Signed-Out Screen Rough

```txt
KからLife Cardが届きました

[表カード]
[裏カード]

このカードを受け取りました
[Life Cardsを始める]
Life Cardsとは？
```

### Signed-Out Requirements

- カード本文は閲覧できる。
- 画像あり共有なら画像ありで閲覧できる。
- 画像なし共有なら default image で閲覧できる。
- `画像ありで登録` は出さない。
- `画像なしで登録` は出さない。
- Import という文脈を見せない。
- ログイン/登録後に取り込むかどうかは別導線で扱う。

## Signed-In Recipient Flow

ログイン済み受信者は `/share/[token]` でカードを閲覧できます。

カード表示の下に、次アクションとして「どう受け取りますか？」を表示します。

`shareMode === "withImage"` の場合:

- 画像付きで登録
- 本文だけ登録

`shareMode === "textOnly"` の場合:

- 本文だけ登録

`textOnly` 共有では、画像付き登録をUIに出しません。server action に直接 `withImage` import が投げられても拒否します。

### Signed-In Screen Rough

```txt
KからLife Cardが届きました

[表カード]
[裏カード]

どう受け取りますか？
[画像付きで登録]
[本文だけ登録]
```

### Signed-In Requirements

- カード本文は閲覧できる。
- 画像あり共有なら画像ありで閲覧できる。
- 画像なし共有なら default image で閲覧できる。
- `withImage` 共有では、画像付き登録と本文だけ登録を選べる。
- `textOnly` 共有では、本文だけ登録のみ選べる。
- `textOnly` 共有では、画像付き登録をUIに出さない。
- `textOnly` 共有で画像付き登録が直接POSTされても server action で拒否する。

## Registration and Import Semantics

Share v3 では、未ログインユーザー向けの「登録」と、ログイン済みユーザー向けの「Import」を明確に分けます。

未ログイン受信者:

- 共有カードを閲覧する。
- Life Cardsを始める導線を見る。
- この時点ではカードのImport方法を選ばない。

ログイン済み受信者:

- 共有カードを閲覧する。
- 閲覧後の次アクションとしてImport方法を選ぶ。
- `withImage` 共有なら、画像付き登録または本文だけ登録を選ぶ。
- `textOnly` 共有なら、本文だけ登録のみ選ぶ。

## Image Handling

### Sender Share Mode

`shareMode` は送信者が選ぶ共有方法です。

- `withImage`: 共有ページに画像を表示できる。
- `textOnly`: 共有ページでは default image を表示する。

### Recipient Import Image Mode

ログイン済み受信者のImport時には、共有 mode とは別に取り込み方法を選びます。

- `withImage`: 本文と画像を取り込む。
- `withoutImage`: 本文のみ取り込む。画像は引き継がない。

`shareMode === "textOnly"` の場合、`withImage` import は許可しません。

## Title Copy

受信画面タイトルは creatorLabel の有無で分岐します。

- creatorLabel あり: `{creatorLabel}からLife Cardが届きました`
- creatorLabel なし: `Life Cardが届きました`

## Button Copy

送信者側:

- 画像ありで共有
- 画像なしで共有

未ログイン受信者側:

- Life Cardsを始める
- Life Cardsとは？

ログイン済み受信者側:

- 画像付きで登録
- 本文だけ登録

## Non-Goals

Share v3 のユーザー導線整理では、以下は行いません。

- QRを2つ作る。
- URLを2つ作る。
- `share_cards` tableを変更する。
- Supabase migrationを追加する。
- DB schemaを変更する。
- Card型を大きく変更する。
- CardFaceを大きく変更する。
- 既存カード保存ロジックを大きく変更する。

## Implementation Notes for Future Work

将来実装する場合は、共有ページの構成を以下の責務に分けると見通しがよくなります。

- Shared card viewer: ログイン状態に関係なくカードを表示する。
- Signed-out recipient CTA: 登録開始導線のみを表示する。
- Signed-in import CTA: `shareMode` に応じてImport方法を表示する。
- Import server action: `shareMode` と import image mode の組み合わせを検証する。

server action 側では、UIに出していない操作も直接POSTされる前提で検証します。

- `shareMode === "withImage"` and import with image: allow.
- `shareMode === "withImage"` and import without image: allow.
- `shareMode === "textOnly"` and import without image: allow.
- `shareMode === "textOnly"` and import with image: reject.

