# Share / People Card Design

## 目的

Life Cards における「カード共有」と「People Card 交換」の実装前設計を残す。

この document はレビュー用の設計案であり、まだコード実装、SQL 実行、Supabase 設定変更は行わない。

今回の対象:

- カード単位の共有。
- People Card の交換。
- URL / QR による受け渡し。
- Import による自分の Life Cards への取り込み。

今回の対象外:

- 共有 Deck。
- 共同編集。
- チーム運用。
- 誰が見たか、誰に送ったかを追跡する機能。
- 社外秘情報、顧客情報、個人情報、契約情報、認証情報などを安全に保管・共有する用途。

## 1. Life Cards の思想

Life Cards の基本思想は以下に置く。

- 保存する。
- 再会する。
- 意味が育つ。

カードは単なる情報管理単位ではなく、未来の自分と再会するための小さな記憶の器として扱う。

共有も同じ思想に沿わせる。共有は、Deck や database の共同所有ではなく、カードを相手に贈る行為として設計する。

つまり Life Cards の共有は「共同編集」ではなく「贈与」である。

## 2. 共有 Deck をやらない理由

共有 Deck は便利だが、Life Cards の現在の思想とは距離がある。

共有 Deck を作ると、設計の中心が以下に寄りやすい。

- 誰が Deck の owner か。
- 誰が編集できるか。
- Deck 内カードの同期競合をどう扱うか。
- 権限をどう分けるか。
- 共同作業の履歴をどう残すか。

これらは team workspace や knowledge base に近い設計であり、Life Cards の「保存する / 再会する / 意味が育つ」という個人的な体験を重くする。

また、共有 Deck は「相手に見せる場所」を作る機能になりやすい。一方で Life Cards が作りたいのは、相手から受け取ったカードが自分の中で時間をかけて意味を持つ体験である。

そのため初期設計では共有 Deck を扱わず、カード単位の共有と People Card 交換に絞る。

## 3. カード共有の基本フロー

カード共有は以下の flow とする。

1. ユーザーが自分のカード詳細から共有を開始する。
2. app が共有用 payload を作る。
3. Supabase に `share_cards` row を作成する。
4. app が share URL を発行する。
5. ユーザーは URL または QR を相手に渡す。
6. 受け取った人は `/share/[token]` を開く。
7. 共有カードの preview を見る。
8. 必要なら自分の Life Cards に Import する。

共有されたカードは原本ではなく snapshot として扱う。送信者が元カードを編集しても、既に発行された share payload は原則変わらない。

この方針により、共有は「自分のカードを相手に渡す」行為として明確になる。

## 4. People Card とは何か

People Card は、人との出会いや自己紹介を Life Cards の形式で交換するためのカードである。

想定例:

- 自分の名前や表示名。
- 連絡先ではなく、相手に残したい言葉。
- 最近関心があること。
- 読んでいる本。
- 会話のきっかけ。
- QR で渡せる小さな自己紹介。

People Card は名刺の置き換えではなく、相手の Life Cards に「再会できる人の記憶」として残るカードである。

People Card 交換も共同編集ではない。自分の People Card を snapshot として相手へ渡し、相手が Import した時点で相手のカードになる。

## 5. profiles table 案

`profiles` は People Card 作成時の表示名や avatar 参照を持つための optional table とする。

初期案:

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text,
  avatar_image_path text,
  representative_card_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

補足:

- `user_id` は `auth.users(id)` と一致させる。
- `display_name` は共有画面で「誰からのカードか」を軽く示すために使える。
- `handle` は将来の公開 profile URL に備えるが、初期実装では必須にしない。
- `avatar_image_path` は Supabase Storage path を想定する。
- `representative_card_id` は自分の代表 People Card を指す optional field とする。

初期実装では `profiles` なしでもカード共有は成立する。People Card を始める段階で追加してよい。

## 6. share_cards table 案

`share_cards` はカード共有用 token と snapshot payload を保持する table とする。

初期案:

```sql
create table if not exists public.share_cards (
  token text primary key,
  creator_user_id uuid references auth.users(id) on delete set null,
  creator_label text not null,
  source_card_id text,
  share_type text not null default 'card',
  card_payload jsonb not null,
  expires_at timestamptz not null,
  view_count integer not null default 0 check (view_count >= 0),
  import_count integer not null default 0 check (import_count >= 0),
  created_at timestamptz not null default now()
);
```

候補 index:

```sql
create index if not exists share_cards_creator_created_at_idx
  on public.share_cards (creator_user_id, created_at desc);

create index if not exists share_cards_expires_at_idx
  on public.share_cards (expires_at);
```

補足:

- `token` は URL に載せる opaque token。推測困難な値にする。
- `creator_user_id` は作成者・贈与者を表すが、閲覧者には原則公開しない。
- `creator_label` は共有時点の表示名 snapshot。受信者画面では user id ではなくこの label を表示する。
- `source_card_id` は creator の元カード id。Import 側では使わない。
- `share_type` は `'card'` / `'people'` を想定する。
- `card_payload` は共有時点の snapshot。
- `expires_at` は初期仕様では作成から 7 日後。
- `view_count` / `import_count` のみ保持する。

## 7. card_payload jsonb 方針

共有は元カードへの live reference ではなく snapshot とするため、`card_payload jsonb` に表示と Import に必要な値を保存する。

初期 payload 例:

```json
{
  "schemaVersion": 1,
  "card": {
    "frontText": "読書メモ",
    "frontComment": "あとで再会したい一節",
    "backText": "Markdown memo...",
    "linkUrl": "https://example.com",
    "imagePath": "signed-or-public-image-reference",
    "imageFitMode": "blurExtend",
    "createdAt": "2026-06-08",
    "updatedAt": "2026-06-08"
  },
  "creator": {
    "label": "K"
  }
}
```

方針:

- `schemaVersion` を必ず持たせる。
- app の `Card` 型をそのまま丸ごと保存しすぎない。
- Import 可能な fields を明示する。
- `isFavorite` や encounter metadata は payload に含めない。
- `deckId` は原則含めない。Import 先の deck は受け手が決める。
- `imageFitMode` は `cover` / `blurExtend` を維持する。

画像について:

- 初期実装では共有用に閲覧可能な画像 URL または Storage path を payload に含める方針を検討する。
- Private Storage の signed URL は期限が短いため、share 期間中に再署名できる repository / server route が必要になる可能性がある。
- People Card の avatar や添付画像も同じ考え方で扱う。

## 8. URL 共有と QR 共有の関係

URL 共有と QR 共有は別機能ではなく、同じ share URL の表示形式違いとして扱う。

例:

```txt
https://life-cards-three.vercel.app/share/{token}
```

URL 共有:

- Copy button で share URL をコピーする。
- SNS や message app に貼り付けられる。

QR 共有:

- 同じ share URL を QR にする。
- 対面で People Card を渡す場面に向いている。
- QR は token を含むため、スクリーンショットや印刷物の取り扱いに注意する。

注意:

- QR を知っている人は share page を開ける。
- URL を知っている人は share page を開ける。
- 初期実装では閲覧者認証を必須にしない。

## 9. `/share/[token]` 画面案

`/share/[token]` は受け取り専用画面とする。

表示内容:

- 共有カード preview。
- creator label があれば軽く表示。
- 有効期限切れの場合の expired message。
- Import button。
- Life Cards を開く / 始める導線。

動作:

- token を Supabase で lookup する。
- `expires_at < now()` なら expired として扱う。
- 表示に成功したら `view_count` を increment する。
- Import に成功したら `import_count` を increment する。

UI 方針:

- Deck 共有ではないため、Deck 一覧や共同編集導線は出さない。
- 「このカードを受け取る」体験に集中させる。
- People Card の場合も同じ画面で扱い、文言だけ少し変える。

## 10. Import 仕様

Import は共有 card payload から、受け手の `cards` table に新しい card を作る処理とする。

基本仕様:

1. 受け手が `/share/[token]` を開く。
2. Import button を押す。
3. 未ログインなら login flow へ誘導する。
4. ログイン後、Import 先 deck を選ぶ。
5. payload から新規 Card を作る。
6. `id` は受け手側で新規発行する。
7. `createdAt` / `updatedAt` は Import 日を使うか、payload の日付を保持するかを選ぶ。

推奨:

- `createdAt`: Import 日。
- `updatedAt`: Import 日。
- 元の共有カード日付は back memo か payload metadata として残すか検討する。
- `isFavorite`: false。
- encounter metadata: 作らない。初回表示時に通常 flow で記録する。
- `deckId`: 受け手が選ぶ。未選択なら `uncategorized`。

Import は copy であり、元カードとの同期はしない。

## 11. 期限 7 日

共有 token の有効期限は初期仕様では 7 日とする。

理由:

- URL / QR が意図せず残り続けるリスクを減らす。
- 「今このカードを渡す」という贈与感を保つ。
- 長期公開ページ化を避ける。

仕様:

- `expires_at = created_at + interval '7 days'`。
- expired 後は card payload を表示しない。
- expired row の削除は初期実装では手動または定期 cleanup のどちらでもよい。

将来検討:

- 1日 / 7日 / 30日などの選択。
- creator による revoke。
- imported 後の token 自動 expire。

## 12. 計測と privacy 方針

初期実装では、以下のみ保持する。

- `view_count`
- `import_count`

保持しないもの:

- 誰が見たか。
- 誰に送ったか。
- 誰が Import したか。
- 閲覧者 IP。
- 閲覧者 user agent。
- 閲覧履歴の詳細。

理由:

- Life Cards は tracking tool ではない。
- People Card 交換は軽く安全な体験にしたい。
- 共有機能を analytics や CRM 的な方向へ寄せない。

必要な注意:

- `view_count` は厳密な unique view ではない。
- reload や bot により増える可能性がある。
- `import_count` も同一ユーザーの複数 Import を初期実装では防がない可能性がある。

## 13. RLS / access 方針メモ

初期方針:

- share 作成は login user のみ。
- share 閲覧は token を知っていれば可能。
- share import は login user のみ。

RLS 案:

- `share_cards` insert: `creator_user_id = auth.uid()`。
- `share_cards` creator select: `creator_user_id = auth.uid()`。
- `/share/[token]` の public read は RLS だけで表現しにくいため、server route / RPC / edge function を検討する。

public token read を直接 table select で開ける場合は、payload に機密情報を入れない前提がより重要になる。

## 14. 実装順序

推奨順:

1. `share_people_card_design.md` で方針確定。
2. `share_cards` SQL migration 案を docs に追加。
3. `ShareCardPayload` 型を app 側に追加。
4. card -> share payload mapper を実装。
5. share token 作成 repository を実装。
6. 既存 Card detail の QR / Share action から share URL 作成へ接続。
7. `/share/[token]` read-only preview 画面を実装。
8. `view_count` increment を実装。
9. Import flow を実装。
10. `import_count` increment を実装。
11. People Card 用 profile / template を追加。
12. People Card QR 交換 UI を追加。
13. 期限切れ cleanup / revoke を検討。

初期 milestone:

- Card share URL が作れる。
- `/share/[token]` で preview できる。
- 自分の Life Cards に Import できる。
- 7 日で expired になる。
- `view_count` / `import_count` が増える。

People Card はその後に、同じ share infrastructure の上に載せる。

## 15. Open Questions

- 共有画像を public に置くか、share token 経由で署名 URL を発行するか。
- Import 後に元カードの作成日をどこまで保持するか。
- People Card は通常 Card の subtype とするか、専用 template とするか。
- share token の revoke UI を初期から入れるか。
- expired row の cleanup を cron / manual / app 起動時のどれで行うか。
