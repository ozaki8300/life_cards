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
- 未ログインでもカード本文は保存できる。
- 未ログインでは画像を保存しない。
- 画像も保存したい時だけログインを促す。
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

未ログイン受信者には画像付きImport選択肢を出しません。ただし、本文だけを受け取る導線は表示します。

`shareMode === "withImage"` の場合に出す導線は以下です。

- どう受け取りますか？
- 画像はこの画面で見られます。
- 保存すると、文字だけのカードとして追加されます。
- 文字だけ保存する
- 画像も保存するにはログインしてください
- Google Login

`shareMode === "textOnly"` の場合に出す導線は以下です。

- このカードを受け取りますか？
- 保存する

未ログインでは画像をローカル保存しません。容量増加を避けるため、`withImage` 共有でも未ログイン保存は本文のみ、画像は閲覧のみです。

### Signed-Out Screen Rough: withImage

```txt
KからLife Cardが届きました

[表カード]
[裏カード]

どう受け取りますか？

画像はこの画面で見られます。
保存すると、文字だけのカードとして追加されます。

[文字だけ保存する]

画像も保存するにはログインしてください
[Google Login]
```

### Signed-Out Screen Rough: textOnly

```txt
KからLife Cardが届きました

[表カード]
[裏カード]

このカードを受け取りますか？

[保存する]
```

### Signed-Out Requirements

- カード本文は閲覧できる。
- カード本文はログインなしで保存できる。
- 画像あり共有なら画像ありで閲覧できる。
- 画像なし共有なら default image で閲覧できる。
- `withImage` 共有でも未ログイン保存は本文のみ。
- 未ログインでは `imagePath`、storage image、shared image を保存しない。
- 未ログインでは画像付き登録を出さない。
- `withImage` 共有では、画像も保存したい場合だけログインを促す。
- `textOnly` 共有では、Google Login を主CTAにしない。
- 主語は「ログイン」ではなく「受け取る」にする。
- 保存ボタン押下後は `保存中...` にして、同一画面内の連打を防ぐ。

## Signed-In Recipient Flow

ログイン済み受信者は `/share/[token]` でカードを閲覧できます。

カード表示の下に、次アクションとして「どう受け取りますか？」を表示します。

`shareMode === "withImage"` の場合:

- 画像付きで登録

`shareMode === "textOnly"` の場合:

- 文字だけ登録

`textOnly` 共有では、画像付き登録をUIに出しません。server action に直接 `withImage` import が投げられても拒否します。

### Signed-In Screen Rough

```txt
KからLife Cardが届きました

[表カード]
[裏カード]

どう受け取りますか？
[画像付きで登録]
```

### Signed-In Requirements

- カード本文は閲覧できる。
- 画像あり共有なら画像ありで閲覧できる。
- 画像なし共有なら default image で閲覧できる。
- `withImage` 共有では、画像付き登録のみ表示する。
- `textOnly` 共有では、文字だけ登録のみ選べる。
- `textOnly` 共有では、画像付き登録をUIに出さない。
- `textOnly` 共有で画像付き登録が直接POSTされても server action で拒否する。
- 登録ボタン押下後は `登録中...` にして、同一画面内の連打を防ぐ。

## Registration and Import Semantics

Share v3 では、未ログインユーザー向けの「登録」と、ログイン済みユーザー向けの「Import」を明確に分けます。

未ログイン受信者:

- 共有カードを閲覧する。
- 文字だけ保存する導線を見る。
- `withImage` 共有でも画像は閲覧のみで、保存は本文のみ。
- 画像も保存したい場合だけログイン導線を見る。

ログイン済み受信者:

- 共有カードを閲覧する。
- 閲覧後の次アクションとしてImport方法を選ぶ。
- `withImage` 共有なら、画像付き登録を選ぶ。
- `textOnly` 共有なら、文字だけ登録のみ選ぶ。

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

未ログイン受信者が受け取る場合は、常に `withoutImage` 相当です。未ログイン保存では `imagePath`、storage image、shared image を保存しません。

## Title Copy

受信画面タイトルは creatorLabel の有無で分岐します。

- creatorLabel あり: `{creatorLabel}からLife Cardが届きました`
- creatorLabel なし: `Life Cardが届きました`

## Button Copy

送信者側:

- 画像ありで共有
- 画像なしで共有

未ログイン受信者側:

- 文字だけ保存する
- 保存する
- 画像も保存するにはログインしてください
- Google Login

ログイン済み受信者側:

- 画像付きで登録
- 文字だけ登録

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
- Signed-out recipient CTA: 本文だけ受け取る導線を表示し、画像保存が必要な場合だけログインを促す。
- Signed-in import CTA: `shareMode` に応じてImport方法を表示する。
- Import server action: `shareMode` と import image mode の組み合わせを検証する。
- Text-only local receive action: 未ログイン受信者が本文のみをローカル保存する。

server action 側では、UIに出していない操作も直接POSTされる前提で検証します。

- `shareMode === "withImage"` and import with image: allow.
- `shareMode === "withImage"` and import without image: allow.
- `shareMode === "textOnly"` and import without image: allow.
- `shareMode === "textOnly"` and import with image: reject.

未ログイン保存では、UIからもコードからも画像保存を行わないようにします。

## Share Image Import Guard

短期修正として、ログイン済み受信者が `withImage` import を選んだ場合は、共有画像を受信者の `card-images` storage にコピーできた時だけカードを作成します。

- `copySharedImageToRecipientStorage` が storage path を返した場合のみ `decks` upsert / `cards` insert に進む。
- `copySharedImageToRecipientStorage` が `null` または空文字を返した場合は、カードを保存せず `/share/[token]?import=image-failed` に戻す。
- `textOnly` / `withoutImage` import は従来通り画像コピーを要求しない。
- 画像コピー後に `decks` upsert または `cards` insert が失敗した場合は、既存通りコピー済み画像を cleanup する。

このガードにより、画像コピーに失敗した共有カードが「画像付き保存成功」のように見える状態を避けます。

## Future Share Image Payload Design

現状の `ShareCardPayload` v1 は `imageStoragePath` を持たず、`withImage` 共有時に `card.imagePath` を `imagePath` として保存します。通常カード一覧では storage path から signed URL を解決し、それを表示用 `imagePath` に載せる経路があります。この signed URL は短寿命なので、共有 payload に永続保存する値としては不安定です。

中期設計では以下のいずれかを検討します。

- `ShareCardPayload` v2 に `imageStoragePath` を追加し、共有ページ側で service role 経由の安全な読み取り/コピーを行う。
- 共有作成時に share 専用 storage path へ画像をコピーし、payload にはその share image path を保存する。
- 共有期限と画像取得期限が一致するよう、signed URL ではなく storage path を永続値、signed URL は表示時の一時値として扱う。

この設計変更には payload migration、互換 parse、必要に応じた storage path 設計が必要です。DB schema や bucket 追加は Share v3 の短期修正範囲には含めません。
