# Commons Design

## 目的

Commons は、ユーザーが公開を許可した Life Card を集める共有カードプールである。

Life Cards の現在の価値は「自分のカードと再会すること」にある。Commons はこの価値を SNS 的な投稿や反応競争へ広げるのではなく、狭い共通文脈の中で良いカードを発見し、自分のカードとして取り込み、未来の自分が Reencounter できるようにするための機能として設計する。

初期ターゲットは Globis 生、経営大学院生、またはそれに近い共通文脈を持つ人たちが作る経営カードとする。全員向け SNS を目指すのではなく、「狭い共通文脈で No.1 のカード発見体験」を狙う。

Commons の中心目的:

- 公開されたカードを発見する。
- 良いカードを自分の My Cards へ取り込む。
- 取り込んだカードを自分の Reencounter 対象にする。

Commons はタイムラインではない。投稿量、いいね数、フォロー数で競う場所ではなく、後から自分の中で意味が育つカードに出会う場所である。

## 1. 用語定義

### My Cards

ユーザー本人が所有する通常の Life Cards。

既存の `cards` table に保存され、本人だけが閲覧・編集できる private なカード群を指す。Reencounter Engine の対象になる中心データである。

### Share Card

特定の相手へ URL / QR などで一時的に渡すカード共有の単位。

既存の共有設計では `share_cards` のような token 付き snapshot として扱う。Commons とは違い、公開プールに並べるものではなく、個別に贈るための共有である。

### Commons Card

Commons Pool に公開されたカード。

元の My Card を直接公開するのではなく、公開時点の snapshot として公開用 table に保存する。閲覧者は Commons Card を見て、自分の My Cards へ Import できる。

### Import / Save to My Cards

Commons Card を自分の `cards` table に新規カードとしてコピーする操作。

Import 後のカードは閲覧者本人の My Card になり、元の Commons Card や公開者の private card とは独立して編集できる。

UI 表記は `Save to My Cards` または日本語では `自分のカードに保存` を候補とする。内部用語としては `Import` を使ってよい。

### Reencounter 対象

Reencounter Engine が未来に再提示できるカード。

Commons Card そのものを直接 Reencounter するのではなく、Import によって自分の `cards` table にコピーされたカードが Reencounter 対象になる。

### Commons Pool

公開許可された Commons Card の集合。

SNS の timeline ではなく、検索、filter、category、品質指標によって良いカードを発見するための共有カードプールである。

## 2. MVP スコープ

### MVP でやること

- 自分のカードを Commons へ公開する。
- Commons 一覧を見る。
- Commons カード詳細を見る。
- Commons カードを自分のカードとして取り込む。
- 取り込んだカードは自分の `cards` table にコピーされる。
- 取り込んだカードは自分の Reencounter 対象になる。

### MVP でやらないこと

- コメント。
- いいね。
- フォロー。
- ランキング競争。
- Deck 単位共有。
- 共同編集。
- 有料課金。
- AI 推薦。

MVP の目的は「共有 SNS を作ること」ではなく、「公開された良いカードを発見し、自分のカードとして取り込み、再会できるようにすること」が成立するかを確認することである。

## 3. DB 設計案

### 基本方針

既存の `cards` を直接 public にしない。

`cards` は My Cards の private data として維持し、Commons 用には公開専用 table を分ける。候補名は `commons_cards` または `public_cards`。Life Cards の機能名と合わせるなら `commons_cards` を推奨する。

公開カードは元カードへの live reference ではなく、公開時点の snapshot として扱う。

理由:

- 元カードの private 性を守りやすい。
- 公開後に元カードを編集しても、公開内容が意図せず変わらない。
- Import 側は公開 snapshot だけを読めばよく、他人の private `cards` を参照しない。
- RLS を `cards` と `commons_cards` で明確に分離できる。

### `commons_cards` table 案

```sql
create table if not exists public.commons_cards (
  id uuid primary key default gen_random_uuid(),
  source_card_id text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  front_text text not null,
  comment_text text,
  back_memo text,
  link_url text,
  deck_name text,
  category text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  imported_count integer not null default 0 check (imported_count >= 0),
  reencounter_count integer not null default 0 check (reencounter_count >= 0),
  view_count integer not null default 0 check (view_count >= 0)
);
```

候補 index:

```sql
create index if not exists commons_cards_active_published_at_idx
  on public.commons_cards (is_active, published_at desc);

create index if not exists commons_cards_owner_idx
  on public.commons_cards (owner_user_id);

create index if not exists commons_cards_category_idx
  on public.commons_cards (category);
```

### 各 field の考え方

- `id`
  - Commons Card の公開用 ID。
- `source_card_id`
  - 公開元の private card ID。RLS 上、閲覧者がこの ID から元カードを読めてはいけない。
- `owner_user_id`
  - 公開者識別用。表示名は直接ここから出さず、`profiles.display_name` などを join / fetch して使う。
- `front_text`
  - カード表面の主要テキスト。
- `comment_text`
  - 表面コメント。
- `back_memo`
  - 裏面メモ。公開時に含めるか、front/comment のみにするかは UI で明示してもよい。
- `link_url`
  - 関連 URL。
- `deck_name` / `category`
  - 公開時点の分類 snapshot。元 deck の ID は原則持たない。
- `image_path` / `image_url`
  - MVP v0 では持たせない、または未使用にする。
  - Storage RLS が固まるまで Commons で画像共有しない。
- `published_at`
  - 初回公開日時。
- `updated_at`
  - Commons Card 自体の更新日時。
- `is_active`
  - 公開中かどうか。削除・非公開は物理削除よりまず `false` を推奨する。
- `imported_count`
  - My Cards に保存された回数。
- `reencounter_count`
  - Import 後に Reencounter 経由で開かれた回数。MVP では未実装でもよい。
- `view_count`
  - Commons 詳細閲覧回数。

### Snapshot 更新方針

推奨は「公開時 snapshot を維持し、元カード編集では自動更新しない」。

理由:

- 公開内容がいつ変わったかをユーザーが理解しやすい。
- 元カードの private 編集が意図せず公開面へ漏れない。
- Import した人が見た内容と公開者の現在の My Card を切り離せる。

将来 option として、公開者が明示的に `Commons の内容を元カードから更新` する操作を追加してもよい。この場合も自動同期ではなく手動更新にする。

### 削除・非公開の扱い

初期は物理削除ではなく `is_active = false` による非公開を推奨する。

- 公開者が非公開にした Commons Card は一覧・検索に出さない。
- 既に Import 済みの My Cards は削除しない。
- Import 済みカードは Import したユーザーの所有物として残る。
- 法務・規約・モデレーション上の問題がある場合は、管理者による強制非公開や物理削除を将来検討する。

`owner_user_id` の auth user が削除された場合は、`on delete cascade` で Commons Card も削除する案と、`on delete set null` にして匿名化する案がある。初期は private data の扱いを単純にするため cascade を推奨する。

## 4. RLS / セキュリティ方針

### 基本方針

- My Cards はこれまで通り本人だけが閲覧・作成・編集・削除できる。
- Commons Card は公開閲覧可能にする。
- Commons へ公開できるのは自分のカードだけ。
- Commons Card を編集・非公開化できるのは公開者だけ。
- Import 時は Commons Card の snapshot を読んで、自分の `cards` へコピーする。
- 他人の private `cards` を直接参照しない。
- `source_card_id` 経由で他人の private card が読めないようにする。

### `cards` table

既存の RLS 方針を緩めない。

- `select`: `user_id = auth.uid()` のみ。
- `insert`: `user_id = auth.uid()` のみ。
- `update`: `user_id = auth.uid()` のみ。
- `delete`: `user_id = auth.uid()` のみ。

Commons 実装のために `cards` を public readable にしてはいけない。

### `commons_cards` table

RLS policy 案:

- `select`
  - `is_active = true` の行は誰でも閲覧可能。
  - 公開者本人は `is_active = false` の自分の行も閲覧可能にしてよい。
- `insert`
  - `owner_user_id = auth.uid()` のみ。
  - さらに server action / RPC 側で `source_card_id` が本人の `cards.id` であることを確認する。
- `update`
  - `owner_user_id = auth.uid()` のみ。
  - 更新可能 field は `is_active`、公開 snapshot、category などに限定する。
- `delete`
  - 初期は直接 delete を許可せず、`is_active = false` を使う方針でもよい。

重要なのは、`commons_cards.source_card_id` を持っていても、閲覧者が `cards` table の該当 row を読めないこと。Import 処理も `source_card_id` ではなく `commons_cards` の snapshot だけを使う。

### Storage / 画像

画像 Storage を雑に public 化しない。

検討案:

- 公開時に Commons 用 bucket / path へ画像をコピーする。
- Commons 用画像だけ public readable にする。
- Private bucket の画像を server route / signed URL で再署名して表示する。

初期は「画像なしで公開」または「Commons 用に明示コピーされた画像だけ公開」を推奨する。private cards の画像 path をそのまま公開 payload に入れて、bucket policy だけで読ませる設計は避ける。

## 5. Import 設計

Commons Card を取り込む時の基本 flow:

1. `commons_cards` から active な公開 snapshot を読む。
2. ユーザーが保存先 deck を選ぶ。未選択の場合は `Commons` deck に保存する。
3. 自分の `cards` table に新規 row を作成する。
4. Import されたカードは自分の My Card になり、Reencounter 対象になる。
5. `commons_cards.imported_count` を増やす。
6. 必要に応じて encounter metadata の初期値を作る。

### コピーする内容

Import では以下をコピーする。

- `front_text`
- `comment_text`
- `back_memo`
- `link_url`
- `image_path` / `image_url`
- `image_fit_mode`
- 選択された deck ID
- `source_commons_card_id`

`source_commons_card_id` は既存 `cards` schema に追加するか検討が必要である。追加する場合、Import 元の分析や重複検知に使える。

ただし、MVP で schema 変更を小さくしたい場合は、まずカード本文だけをコピーし、Import 履歴 table を別途持つ案もある。

### Import 履歴 table 案

将来の重複防止や metrics のために、`commons_imports` を持つ案もある。

```sql
create table if not exists public.commons_imports (
  id uuid primary key default gen_random_uuid(),
  commons_card_id uuid not null references public.commons_cards(id) on delete cascade,
  importer_user_id uuid not null references auth.users(id) on delete cascade,
  imported_card_id text not null,
  imported_at timestamptz not null default now()
);
```

用途:

- 同じユーザーが同じ Commons Card を何度も Import するか制御する。
- `recent_imports` を計算する。
- reencounter metrics を集計する。

MVP では `imported_count` の increment だけでも成立するが、品質指標を育てるなら履歴 table がある方がよい。

### encounters 初期値

Import 直後に encounters metadata を作るかは検討事項。

案 A: 作らない。

- 通常の新規カードと同じ扱い。
- 初回詳細閲覧時に encounter metadata が作られる。
- 実装が単純。

案 B: Import 時に作る。

- `firstViewedAt` / `lastViewedAt` を Import 時刻にする。
- `source = "commons_import"` のような metadata を将来持てる。
- Import したカードを Reencounter に乗せやすい。

初期推奨は案 A。Import したカードが `cards` table に存在する時点で Reencounter 対象にはできるため、encounter metadata の作成は既存の閲覧記録 flow に任せる。

### 画像の扱い

画像は最も権限設計を間違えやすい。

検討案:

- 画像なしで Import する。
- Commons 用 public image URL をそのままコピーする。
- Import 時に自分の private Storage 領域へ画像をコピーする。
- server route 経由で再署名しながら表示する。

初期推奨は「画像なし」または「Commons 用に公開済みの画像だけコピー」。private bucket の元画像を直接参照し続ける設計は避ける。

## 6. UI 導線案

### トップ / ホーム

主要 navigation:

- `My Cards`
- `Commons`

Commons は投稿画面ではなく発見画面として置く。初期は My Cards の体験を邪魔しないよう、主導線は控えめでよい。

### Commons 一覧

要素:

- 検索。
- category / deck filter。
- card preview。
- 保存数。
- 再会率または再会数。

一覧は timeline ではなく、カードを探すための pool として設計する。新着順だけに寄せると投稿競争に近づくため、初期でも category、検索、保存数のような発見軸を持たせたい。

### Commons 詳細

表示要素:

- Front。
- Comment。
- Back Memo。
- Link。
- 作者。
- 取り込むボタン。

作者表示は `owner_user_id` ではなく `profiles.display_name` を使う。display name がない場合は匿名的な表示にする。

主要 action:

- `自分のカードに保存`
- `Save to My Cards`

初期はコメント欄やいいねボタンを置かない。

### Card 詳細

自分のカード詳細に `Commons へ公開` 導線を置く案。

ただし初期は控えめでよい。Life Cards の中心体験は My Cards と Reencounter であり、Commons 公開を過度に促すと投稿 SNS の圧が生まれる。

公開 flow では以下を明示する。

- 公開される fields。
- 画像を公開するかどうか。
- 元カードを編集しても Commons Card は自動更新されないこと。
- 非公開にしても既に Import されたカードは相手の My Cards に残ること。

## 7. 指標

SNS 的な `like` ではなく、Life Cards らしい指標を使う。

候補:

- `imported_count`
  - 自分のカードとして保存された回数。
- `reencounter_count`
  - Import 後に Reencounter 経由で開かれた累計回数。
- `reencounter_rate`
  - Import 数に対して、一定期間内に Reencounter された割合。
- `view_count`
  - Commons 詳細で閲覧された回数。
- `recent_imports`
  - 直近期間の Import 数。
- `quality_score`
  - Import、Reencounter、通報、経過時間などを組み合わせた内部 score。

初期 MVP では `imported_count` と `view_count` だけでもよい。

`reencounter_rate` は Life Cards らしいが、十分な母数がないと不安定である。初期から強く表示すると誤解を生むため、一定数以上の Import / Reencounter が集まってから使う。

表示上はランキング競争にしない。

例:

- `保存 24`
- `再会 8`
- `最近保存されています`

`人気ランキング 1位` のような表現は避ける。

## 8. モデレーション / 品質

Commons は公開プールであるため、品質と安全性の設計が必要である。

想定問題:

- test カード。
- 個人情報。
- 著作権侵害。
- 授業資料の丸写し。
- 不適切内容。
- 誤情報。
- 宣伝・スパム。

### 初期対応案

- 公開は手動操作にする。
- 公開前に preview / confirmation を挟む。
- まず自分用または限定コミュニティで小さく始める。
- Globis Commons のように共通文脈を限定する。
- 公開ガイドラインを短く明示する。
- 通報機能は MVP 外でも将来必須として設計余地を残す。

### 公開ガイドライン案

公開してよいもの:

- 自分の言葉で要約した学び。
- 経営概念の理解を助ける問い。
- 読書や授業から得た自分なりの insight。
- 他者が Reencounter して価値を感じそうなカード。

公開しないもの:

- 個人情報。
- 顧客情報、社外秘、契約情報。
- 授業資料や書籍本文の丸写し。
- 著作権者の許可がない画像や文章。
- 誹謗中傷、不適切内容。

### 将来の管理機能

- 通報。
- 管理者による非公開化。
- 公開者への warning。
- `is_active = false` とは別の `moderation_status`。
- コミュニティ別 Commons。

## 9. 実装ステップ案

### Step 0: docs だけ作成

- Commons の目的、スコープ、DB、RLS、Import、UI、指標、モデレーション方針を docs に残す。
- コード変更、DB 変更、Supabase 設定変更は行わない。

### Step 1: DB schema draft / RLS draft

- `commons_cards` schema を SQL draft として作る。
- 必要なら `commons_imports`、`profiles` 参照、Storage policy を検討する。
- RLS policy を draft 化する。

### Step 2: Commons publish / unpublish

- 自分のカードから Commons Card を作る。
- 公開 snapshot を確認して publish する。
- 公開者だけが unpublish できる。

### Step 3: Commons list / detail

- active な Commons Card 一覧を表示する。
- 詳細画面で snapshot を表示する。
- `view_count` を更新する。

### Step 4: Import to My Cards

- Commons Card を自分の `cards` table にコピーする。
- deck 選択または `Commons` deck へ保存する。
- `imported_count` を更新する。
- Import 後のカードを Reencounter 対象にする。

### Step 5: metrics

- `imported_count`、`view_count` を表示する。
- 将来 `reencounter_count` / `reencounter_rate` を集計する。
- 十分な母数がない指標は表示しすぎない。

### Step 6: search / filters

- keyword search。
- category filter。
- deck_name filter。
- recent imports などの発見軸。

AI 推薦は MVP 外とし、手動検索・filter・軽い品質指標から始める。

## 10. 絶対にやらないこと

- 既存 `cards` をいきなり public 化しない。
- RLS を緩めない。
- private card の直接参照を許可しない。
- `source_card_id` から他人の private card を読める設計にしない。
- コメント / SNS 機能を先に作らない。
- Deck 共有を先に作らない。
- 画像 Storage 権限を雑に public 化しない。
- 投稿数、いいね数、フォロー数を中心体験にしない。

## 11. 初期判断まとめ

初期設計の推奨:

- table 名は `commons_cards`。
- Commons Card は公開時 snapshot。
- 元カード編集による自動同期はしない。
- 非公開は `is_active = false`。
- Import は `commons_cards` の snapshot から自分の `cards` へコピー。
- 画像は初期では慎重に扱い、private Storage を直接 public にしない。
- MVP の指標は `imported_count` と `view_count` から始める。
- コメント、いいね、フォロー、Deck 共有、AI 推薦は後回し。

Commons は「投稿する場所」ではなく、「良いカードと出会い、自分の未来へ持ち帰る場所」として設計する。

## 12. MVP v0 実装前詳細設計

この section は、上記の思想・設計方針を MVP v0 として実装可能な粒度へ具体化する。

今回の対象は実装計画の明文化のみであり、コード変更、DB 変更、Supabase 設定変更は行わない。

### 12.1 MVP v0 の確定スコープ

MVP v0 でやること:

- `commons_cards` table 設計。
- `commons_imports` table 設計。
- RLS SQL draft。
- 自分のカードを Commons へ公開する。
- 公開済みカードを非公開化する。
- Commons 一覧を見る。
- Commons 詳細を見る。
- Commons Card を自分の My Cards へ Import する。
- Import したカードを Reencounter 対象にする。

MVP v0 でやらないこと:

- 画像共有。
- コメント。
- いいね。
- フォロー。
- ランキング。
- AI 推薦。
- 課金。
- Deck 共有。
- 共同編集。
- 元カードとの自動同期。
- Import 済みカードの自動更新。

MVP v0 の成功条件は、「画像なしでも、共通文脈の良いカードを発見し、自分の My Cards へ安全に取り込み、Reencounter 対象にできる」ことである。

### 12.2 MVP v0 の画像方針

MVP v0 では画像共有しない。

明確な方針:

```txt
MVP v0 では commons_cards に image_path / image_url を持たせない、または未使用にする。
Import 時も画像はコピーしない。
```

理由:

- Storage RLS が複雑になる。
- private card の画像漏洩リスクがある。
- Commons の価値検証は画像なしでも可能。
- App Store 前後の安全性を優先する。
- 画像は本文よりも著作権・個人情報・授業資料写り込みのリスクが高い。

MVP v0 の公開 preview では、画像が含まれないことを明示する。

将来対応として後回しにするもの:

- Commons 用 public 画像 bucket へ明示コピーする。
- 公開前に画像を含めるか選択できるようにする。
- 公開前に画像含有確認を出す。
- 画像なし公開を default にし、画像付き公開は opt-in にする。
- private Storage の画像を直接公開せず、Commons 用に別 path へ copy する。

### 12.3 既存 `cards` schema との対応

現行の `Card` 型は [src/lib/types.ts](/home/ozaki/projects/life_cards/src/lib/types.ts:10) で定義されている。

```ts
export type Card = {
  id: string;
  deckId: string;
  defaultImageKey?: DefaultCardImageKey;
  imagePath?: string;
  imageStoragePath?: string;
  imageFitMode?: CardImageFitMode;
  imageFrameMode?: CardImageFrameMode;
  linkUrl?: string;
  isFavorite?: boolean;
  frontText?: string;
  frontComment?: string;
  backText?: string;
  createdAt: string;
  updatedAt: string;
};
```

Supabase の `cards` table は設計上、以下の対応になっている。

| Card field | cards column | Commons Import 方針 |
| --- | --- | --- |
| `id` | `id text` | Import 時に新規 ID を発行する。 |
| `deckId` | `deck_id text` | ユーザーが選ぶ。未選択なら `Commons` deck を作成または利用する。 |
| user owner | `user_id uuid` | Import 実行者の `auth.uid()` を入れる。 |
| `frontText` | `front_text text` | `commons_cards.front_text` からコピーする。 |
| `frontComment` | `front_comment text` | `commons_cards.comment_text` からコピーする。 |
| `backText` | `back_text text` | `commons_cards.back_memo` からコピーする。 |
| `linkUrl` | `link_url text` | `commons_cards.link_url` からコピーする。 |
| `isFavorite` | `is_favorite boolean` | `false` にする。 |
| `defaultImageKey` | `default_image_key text` | `paper` など既定値にする。 |
| `imagePath` / `imageStoragePath` | `image_path text` | MVP v0 ではコピーしない。空文字または `null`。 |
| `imageFitMode` | `image_fit_mode text` | 画像なしでも既存必須挙動に合わせ `cover` を入れてよい。 |
| `createdAt` | `created_at timestamptz` | Import 時刻。 |
| `updatedAt` | `updated_at timestamptz` | Import 時刻。 |

注意点:

- `cards.id` は `text` で、primary key は `(user_id, id)`。
- `deck_id` も `text` で、`decks(user_id, id)` への foreign key を持つ。
- 現行 repository は `link_url` を扱っているが、古い SQL design document には `link_url` が抜けている箇所がある。Commons 実装前に実 DB schema と migration history を確認する。
- `source_commons_card_id` を `cards` table に追加するかは未確定。MVP v0 では `commons_imports.imported_card_id` で追跡する方が `cards` schema への影響を小さくできる。

MVP v0 の Import は、テキスト中心 field だけをコピーする。

- コピーする: `front_text`、`front_comment`、`back_text`、`link_url`。
- Import 時に設定する: `id`、`user_id`、`deck_id`、`created_at`、`updated_at`、`is_favorite=false`。
- コピーしない: `image_path`、`image_fit_mode` の実画像意味、`default_image_key` の元値、encounter metadata、favorite。

### 12.4 DB schema draft

以下は Supabase SQL として実装可能に近い draft である。今回は実行しない。

#### `commons_cards`

```sql
create table if not exists public.commons_cards (
  id uuid primary key default gen_random_uuid(),
  source_card_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  front_text text not null,
  comment_text text,
  back_memo text,
  link_url text,
  deck_name text,
  category text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  imported_count integer not null default 0 check (imported_count >= 0),
  view_count integer not null default 0 check (view_count >= 0)
);

create index if not exists commons_cards_active_published_at_idx
  on public.commons_cards (is_active, published_at desc);

create index if not exists commons_cards_owner_published_at_idx
  on public.commons_cards (owner_user_id, published_at desc);

create index if not exists commons_cards_category_idx
  on public.commons_cards (category);
```

MVP v0 では `image_path` / `image_url` / `image_fit_mode` を入れない。既存カードに画像があっても Commons snapshot には含めない。

`source_card_id` は公開者の元カード ID だが、閲覧者がこの値から `cards` table を読めてはいけない。Commons の閲覧と Import は `commons_cards` の snapshot だけで完結させる。

#### `commons_imports`

```sql
create table if not exists public.commons_imports (
  id uuid primary key default gen_random_uuid(),
  commons_card_id uuid not null references public.commons_cards(id) on delete cascade,
  importer_user_id uuid not null references auth.users(id) on delete cascade,
  imported_card_id text not null,
  imported_at timestamptz not null default now(),
  unique (commons_card_id, importer_user_id)
);

create index if not exists commons_imports_importer_imported_at_idx
  on public.commons_imports (importer_user_id, imported_at desc);

create index if not exists commons_imports_commons_card_idx
  on public.commons_imports (commons_card_id);
```

同一ユーザーが同じ Commons Card を何度も Import できるか:

- MVP v0 では重複 Import を避ける。
- `unique (commons_card_id, importer_user_id)` を置く。
- 理由は、誤操作による重複保存と `imported_count` の水増しを防ぐため。

将来、同じカードを複数 deck に入れたい需要が明確になったら、unique 制約を外すか、`target_deck_id` を含む unique に変更する。

### 12.5 RLS SQL draft

以下は draft であり、今回は実行しない。

#### `commons_cards` RLS

```sql
alter table public.commons_cards enable row level security;

create policy "Commons cards are readable when active"
  on public.commons_cards
  for select
  to authenticated
  using (
    is_active = true
    or owner_user_id = auth.uid()
  );

create policy "Users can publish their own commons cards"
  on public.commons_cards
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
  );

create policy "Owners can update their commons cards"
  on public.commons_cards
  for update
  to authenticated
  using (
    owner_user_id = auth.uid()
  )
  with check (
    owner_user_id = auth.uid()
  );
```

MVP v0 では delete policy を作らない。非公開は `is_active = false` で表現する。

`source_card_id` が本人の `cards` に属することは、RLS policy だけに押し込まず、アプリ側または RPC 側で必ず確認する。より堅くするなら publish を RPC 化し、RPC 内で `cards.user_id = auth.uid()` を確認してから `commons_cards` に snapshot insert する。

`update` policy は「所有者だけ更新できる」境界を作るが、更新可能 column の制限までは表現しない。MVP v0 の実装では repository / RPC 側で `is_active` と snapshot field だけを更新対象にし、`owner_user_id` や metrics を client から任意更新させない。

#### `commons_imports` RLS

```sql
alter table public.commons_imports enable row level security;

create policy "Users can read their own commons imports"
  on public.commons_imports
  for select
  to authenticated
  using (
    importer_user_id = auth.uid()
  );

create policy "Users can create their own commons imports"
  on public.commons_imports
  for insert
  to authenticated
  with check (
    importer_user_id = auth.uid()
  );
```

MVP v0 では `commons_imports` の update / delete は不要。

注意:

- `cards` table の RLS は絶対に緩めない。
- `source_card_id` から private `cards` を読めないこと。
- Commons 閲覧は `commons_cards` snapshot だけで完結すること。
- `commons_imports` は原則本人だけが読める。全体集計は `commons_cards.imported_count` や将来の server-side aggregation で扱う。

### 12.6 公開 / 更新 / 非公開 flow

#### 公開

```txt
My Card
↓
Commonsへ公開
↓
公開内容 preview
↓
画像は含まれないことを明示
↓
確認
↓
source_card_id が自分の cards に属することを確認
↓
commons_cards へ snapshot insert
```

公開 snapshot に含めるもの:

- `source_card_id`
- `owner_user_id`
- `front_text`
- `comment_text`
- `back_memo`
- `link_url`
- `deck_name`
- `category`

公開 snapshot に含めないもの:

- 画像。
- favorite。
- encounter metadata。
- private deck ID。
- private Storage path。

#### 更新

```txt
My Card編集
↓
Commonsは自動更新されない
↓
公開者が「Commons版を更新」を押す
↓
更新内容 preview
↓
画像は含まれないことを明示
↓
確認
↓
commons_cards snapshotを上書き
```

更新できるのは公開者だけ。元カードを編集しても Commons Card は自動更新されない。

`source_card_id` がすでに削除されている場合は、自動更新できない。公開者に「元カードが見つからないため、Commons 版を更新できません」と表示し、非公開操作は可能にする。

#### 非公開

```txt
Commons管理
↓
非公開
↓
確認
↓
is_active=false
```

非公開にしても、既に Import された他人の My Cards は消えない。

これは「贈与されたカードは受け取った人のもの」という Life Cards の思想に沿う。Commons Card は公開者が公開状態を管理するが、Import 後カードは Import したユーザーの独立した My Card である。

### 12.7 Import flow

```txt
Commons詳細
↓
自分のカードに保存
↓
保存先 Deck 選択
↓
active な commons_cards snapshot を読む
↓
cards へ insert
↓
commons_imports へ insert
↓
commons_cards.imported_count +1
↓
My Cards へ遷移
```

Import の注意:

- Import は snapshot から作る。
- `source_card_id` ではなく `commons_cards` から読む。
- Import 後のカードは自分の card。
- 元 Commons Card が更新されても Import 済みカードは自動更新されない。
- 元 Commons Card が非公開になっても Import 済みカードは消えない。
- `is_favorite` は `false`。
- 画像はコピーしない。
- deck はユーザーが選ぶ。未選択の場合は `Commons` deck を作成または利用する。
- `commons_imports` の unique 制約に当たった場合は、既に保存済みであることを UI で伝える。

`imported_count` の increment と `commons_imports` insert は競合しやすいため、実装時は RPC で transaction 化する案を優先する。

RPC 化する場合の責務:

- active な `commons_cards` を読む。
- duplicate import を確認する。
- target deck が本人の deck であることを確認する。
- `cards` に insert する。
- `commons_imports` に insert する。
- `commons_cards.imported_count` を increment する。

### 12.8 UI 最小構成

MVP v0 で作る画面:

- Commons 一覧。
- Commons 詳細。
- My Card 詳細または編集画面から `Commonsへ公開`。
- 公開済みカードの `Commons版を更新`。
- 公開済みカードの `非公開`。

Commons 一覧:

- keyword search は Step 6 でもよい。
- 最初は active な Commons Card を `published_at desc` で表示する。
- card preview、deck/category、保存数、作者 display name を表示する。

Commons 詳細:

- Front。
- Comment。
- Back Memo。
- Link。
- 作者。
- `自分のカードに保存` button。
- 画像は含まれないことを必要に応じて注記する。

My Card 詳細 / 編集:

- `Commonsへ公開` button。
- 既に公開済みなら `Commons版を更新` と `非公開`。
- 公開 preview で、公開対象 field と画像なしを確認させる。

MVP v0 で入れない UI:

- コメント欄。
- いいね。
- フォロー。
- ランキング。
- 投稿フィード。

### 12.9 実装順序

安全な順序:

1. SQL draft 作成。
2. Supabase で schema / RLS 適用。
3. 型定義追加。
4. repository 追加。
5. publish / unpublish 実装。
6. list / detail 実装。
7. import 実装。
8. event logging 追加。
9. lint / build。
10. 手動テスト。

この順序にする理由:

- 先に DB / RLS 境界を固める。
- publish / unpublish を Import より先に作り、公開 snapshot の安全性を確認する。
- Import は最後に transaction と重複制御を含めて作る。
- event logging は MVP の体験が通った後に追加する。

### 12.10 手動テスト項目

必須テスト:

- User A が自分のカードを公開できる。
- User B が Commons 一覧で User A の active Commons Card を見られる。
- User B が User A の private `cards` を直接読めない。
- User B が Commons Card を Import できる。
- Import 後カードは User B の My Cards に入る。
- Import 後カードの `is_favorite` は `false`。
- Import 後カードに画像が入らない。
- User A が元カードを編集しても Commons は自動更新されない。
- User A が `Commons版を更新` を明示実行した時だけ Commons が変わる。
- User A が非公開にすると Commons 一覧から消える。
- User B の Import 済みカードは User A の非公開後も消えない。
- User B は User A の inactive Commons Card を一覧で見られない。
- User A は自分の inactive Commons Card を管理画面で見られる。
- 同じ User B が同じ Commons Card を二重 Import できない、または保存済みとして扱われる。
- 未ログイン時は Commons 閲覧・Import・公開操作の扱いが仕様通りになる。

未ログイン時の初期推奨:

- Commons 一覧 / 詳細はログイン要求に寄せる。
- Import、公開、更新、非公開は必ずログイン必須。
- 将来 SEO や公開閲覧を重視する場合だけ anonymous select を検討する。

### 12.11 既存 schema との懸念点

- `cards.link_url` は実装 repository では使われているが、古い SQL design document には抜けがある。実 DB に column があるか確認が必要。
- `cards.id` が `text` なので、`commons_cards.source_card_id` と `commons_imports.imported_card_id` も MVP v0 では `text` にする。
- `cards` の primary key は `(user_id, id)` なので、`imported_card_id` だけでは全体一意ではない。`commons_imports.importer_user_id + imported_card_id` で Import 後カードを特定する。
- `source_commons_card_id` を `cards` に追加すると便利だが、MVP v0 では `commons_imports` で追跡する方が安全。
- 画像関連 field は現行 `Card` 型に存在するが、MVP v0 の Commons ではコピーしない。Import されたカードの見た目は default image で成立させる。

## 13. `share_cards` 拡張案の調査と比較

Commons は `commons_cards` という新 table ではなく、既存の Share Card snapshot に public pool 用の flag を追加して実装できる可能性がある。

この section では、現行の `share_cards` / share token 実装を調査し、`share_cards` 拡張案と `commons_cards` 別 table 案を比較する。

今回もコード変更、DB 変更、Supabase 設定変更は行わない。

### 13.1 現行 `share_cards` table の schema

現行 SQL draft は [docs/share_people_card_apply_sql_v1.md](/home/ozaki/projects/life_cards/docs/share_people_card_apply_sql_v1.md:62) にある。

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
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

補足:

- primary key は `token`。
- `creator_user_id` は作成者。`on delete set null` のため、アカウント削除後に orphan row になり得る。
- `creator_label` は共有時点の表示名 snapshot。
- `source_card_id` は creator 側の元カード ID。
- `share_type` は現行 check constraint では `card` / `people`。
- `card_payload` は共有時点の snapshot。
- `expires_at` は必須。
- `view_count` / `import_count` / `last_viewed_at` を持つ。
- `revoked` や `is_active` は現行 schema にはない。

### 13.2 `card_payload` の snapshot 内容

現行 payload 型は [src/lib/shareCardPayload.ts](/home/ozaki/projects/life_cards/src/lib/shareCardPayload.ts:9) にある。

```ts
export type ShareCardPayload = {
  schemaVersion: 1;
  shareMode: "withImage" | "textOnly";
  card: {
    frontText?: string;
    frontComment?: string;
    backText?: string;
    defaultImageKey?: DefaultCardImageKey;
    linkUrl?: string;
    imagePath?: string;
    imageFitMode: CardImageFitMode;
    imageFrameMode?: CardImageFrameMode;
    createdAt: string;
    updatedAt: string;
  };
  creator: {
    label: string;
  };
};
```

保持しているもの:

- front text。
- front comment。
- back text。
- link URL。
- default image key。
- image path。
- image fit mode。
- image frame mode。
- card created / updated。
- creator label。
- share mode。

保持していないもの:

- deck ID。
- deck name。
- category。
- favorite。
- encounter metadata。
- owner profile の live reference。
- Commons 用 moderation status。

現行 payload は Commons とかなり近い snapshot だが、Commons MVP v0 で欲しい `deck_name` / `category` / moderation / permanent publish state は持っていない。また、画像を持てる `withImage` 設計があるため、Commons v0 の「画像なし」方針とは明示的に分ける必要がある。

### 13.3 share 作成・更新の実装

現行の share 作成は [src/lib/supabase/shareCardSupabaseRepository.ts](/home/ozaki/projects/life_cards/src/lib/supabase/shareCardSupabaseRepository.ts:87) にある。

動き:

1. login user を取得する。
2. `createShareCardPayload(card, creatorLabel, shareMode)` で snapshot を作る。
3. 同じ `creator_user_id`、`source_card_id`、`share_type` の未期限切れ row を探す。
4. 見つかれば既存 token を再利用し、`card_payload` と `creator_label` を update する。
5. なければ新 token を作り、`expires_at = now + 7 days` で insert する。
6. share URL は `/share/{token}`。

重要な違い:

- 現行 share は「同じカードの有効な共有 token を再利用し、payload を更新する」。
- Commons は「公開 pool 上の公開 snapshot」を安定して管理したい。
- Commons を `share_cards` に混ぜる場合、この token reuse logic が Commons row に誤って作用しないよう `share_type` や `visibility` 条件を追加する必要がある。

### 13.4 expires / revoked / active の扱い

現行:

- `expires_at` は必須。
- lookup 時に `expires_at > now()` を必ず確認する。
- 期限切れ row は expired として扱う。
- `revoked` はない。
- `is_active` はない。
- delete policy は creator に許可されている SQL draft だが、revoke UI は open question。

Commons との違い:

- Share Card は期限付きの一時共有。
- Commons Card は原則、公開者が非公開にするまで永続公開。
- Commons には `is_active` / `published_at` / `updated_at` が必要。
- Commons に `expires_at` 必須は概念的に合わない。`expires_at null` を許すか、遠い未来日時を入れる必要が出る。

`share_cards` を Commons に拡張するなら必要になる変更:

- `expires_at` nullable 化、または `publish_mode` による扱い分岐。
- `is_public_pool boolean` または `visibility text` の追加。
- `is_active boolean` / `published_at` / `updated_at` の追加。
- `share_type` check に `commons` を追加するか、`share_type` と `visibility` を分離する。
- token reuse lookup から Commons row を除外する条件追加。

### 13.5 token URL と RLS の設計

現行 RLS draft:

```sql
create policy "share_cards_select_created"
  on public.share_cards
  for select
  using (creator_user_id = auth.uid());

create policy "share_cards_insert_created"
  on public.share_cards
  for insert
  with check (creator_user_id = auth.uid());

create policy "share_cards_update_created"
  on public.share_cards
  for update
  using (creator_user_id = auth.uid())
  with check (creator_user_id = auth.uid());

create policy "share_cards_delete_created"
  on public.share_cards
  for delete
  using (creator_user_id = auth.uid());
```

一般閲覧者向けに `share_cards` table を直接 public select で開けない方針になっている。

現行 `/share/[token]` は [src/app/share/[token]/page.tsx](/home/ozaki/projects/life_cards/src/app/share/[token]/page.tsx:319) で service role client を使って token lookup している。

lookup の特徴:

- `.from("share_cards").select("creator_label,card_payload,expires_at").eq("token", token).maybeSingle()`
- service role で RLS を bypass する。
- app 側で `expires_at` を確認する。
- 返す情報は `creator_label` と `card_payload` と `expires_at` に絞る。
- `creator_user_id` は表示に返さない。

Commons への示唆:

- token を知っている人だけが見る一時共有と、一覧検索できる public pool は access pattern が違う。
- Commons 一覧を `share_cards` で実現するなら、token lookup ではなく active Commons row の一覧 query が必要。
- その一覧 query を service role route でやるか、RLS で authenticated select を開けるかを決める必要がある。
- `share_cards` を直接 public readable にするのは、既存共有 payload 全体を危険にさらすため避けるべき。

### 13.6 未ログイン閲覧とログイン済み Import の導線

現行 `/share/[token]` の導線:

- 未ログインでも `/share/[token]` を開いて preview できる。
- 未ログインの場合、`SharedCardReceiveActions` で text-only card を client repository に保存できる。
- 画像付き保存は login を促す。
- ログイン済みの場合、server action `importSharedCard` で `cards` table へ insert する。
- server action は `getShareCardState(token)` で再度 token / expiry / payload を確認する。
- Import 後は `/cards` へ redirect。

現行 Import の内容:

- `front_text`、`front_comment`、`back_text`、`link_url` をコピー。
- `is_favorite=false`。
- deck は `uncategorized` を upsert して保存。
- `default_image_key` は payload からコピー。
- `image_path` は画像付き Import の場合、共有画像を recipient storage へ copy して保存。
- `import_count` を increment。

Commons MVP v0 との違い:

- Commons はログイン済み Import を前提にした方がよい。
- Commons v0 では画像をコピーしない。
- Commons は保存先 deck 選択、または `Commons` deck を使う。
- Commons は `commons_imports` のような Import 履歴で重複制御したい。
- 現行 share Import は token 単位で、誰が Import したかを保持しない。

### 13.7 `share_cards` を Commons 用に拡張できるか

技術的には可能。

理由:

- `share_cards` はすでに snapshot を持つ。
- creator user を持つ。
- view / import count を持つ。
- token URL と preview / import flow がある。
- payload mapper と parser を reuse できる。

ただし、MVP v0 の本命実装としては慎重に扱うべきである。

必要な拡張例:

```sql
alter table public.share_cards
  add column if not exists visibility text not null default 'token';

alter table public.share_cards
  add column if not exists is_active boolean not null default true;

alter table public.share_cards
  add column if not exists published_at timestamptz;

alter table public.share_cards
  add column if not exists updated_at timestamptz not null default now();

alter table public.share_cards
  add column if not exists category text;

alter table public.share_cards
  add column if not exists deck_name text;
```

追加で必要になる設計:

- `visibility in ('token', 'commons')` の check。
- `expires_at` を nullable にするか、Commons では無視する規約。
- `share_type` と `visibility` の責務分離。
- Commons 一覧用 index。
- Commons 用 RLS / server route。
- token share の reuse lookup が `visibility = 'token'` のみを対象にする修正。
- Commons v0 では payload `shareMode = 'textOnly'` に固定する制約。
- Commons Import 履歴 table の追加。

この時点で、`share_cards` は「一時共有」と「Commons 公開」の両方を背負う table になり、概念が重くなる。

### 13.8 `commons_cards` 別 table 案と `share_cards` 拡張案の比較

| 観点 | `share_cards` 拡張案 | `commons_cards` 別 table 案 |
| --- | --- | --- |
| RLS 安全性 | 既存の token 共有 payload と Commons 一覧が同居するため policy が複雑になる。誤って token share を一覧公開するリスクがある。 | My Cards、Share、Commons の境界が分かれる。Commons 用に active select policy を設計しやすい。 |
| 実装量 | payload mapper、token preview、Import の一部を reuse できる。ただし expiry nullable、visibility、reuse lookup 修正、一覧 query、RLS 分岐が必要。 | 新 repository / table が必要。ただし Commons の要件に合わせた schema にできる。 |
| 既存共有機能への影響 | 高い。`share_cards` schema と作成・更新 logic を変えるため、既存 QR / URL 共有に regression risk がある。 | 低い。既存 share token flow をほぼ触らずに済む。payload mapper の考え方だけ reuse できる。 |
| 一時共有と Commons 公開の概念分離 | 弱い。token share と public pool が同じ table になり、`expires_at` と `is_active` が混在する。 | 強い。Share Card は贈与、一時共有。Commons Card は公開 pool として整理できる。 |
| 将来の検索・カテゴリ・指標 | 追加 column と index で可能。ただし token share には不要な column が増える。 | 最初から `category`、`deck_name`、`imported_count`、`view_count`、将来の moderation を置きやすい。 |
| 期限切れ共有と永続公開の違い | `expires_at` 必須設計と衝突する。nullable 化または visibility 別解釈が必要。 | Commons は `is_active`、Share は `expires_at` と分けられる。 |
| Import 設計 | 現行 share Import を流用できるが、Commons の重複制御や deck 選択とはズレる。 | `commons_imports` で Import 履歴と重複制御を設計しやすい。 |
| 画像方針 | 現行 payload は `withImage` を持つため、Commons v0 では text-only 固定制約が必要。 | v0 schema から画像を外せる。Storage RLS の問題を避けやすい。 |
| moderation | `share_cards` に moderation column を足すと一時共有にも概念が混ざる。 | Commons 専用に `moderation_status` 等を追加しやすい。 |

### 13.9 結論

推奨は `commons_cards` 別 table 案。

理由:

- 現行 `share_cards` は「token を知っている人が期限内に見る一時共有」に最適化されている。
- Commons は「一覧検索される永続的な公開 pool」であり、access pattern が違う。
- `expires_at` 必須、token primary key、token reuse logic、画像あり payload は Commons MVP v0 と噛み合わない。
- `share_cards` を拡張すると、既存 URL / QR 共有の regression risk が高い。
- Commons は将来、category、search、moderation、quality metrics、Import history を持つため、専用 table の方が育てやすい。
- RLS 境界を `cards` / `share_cards` / `commons_cards` で分ける方が安全。

ただし、実装資産は reuse する。

Reuse したいもの:

- `ShareCardPayload` の schemaVersion 付き snapshot という考え方。
- card -> snapshot mapper の方針。
- `creator_label` を snapshot として持つ方針。
- Import 時に `cards` へ新規 insert し、`is_favorite=false` にする方針。
- `source_card_id` を Import 側で private card lookup に使わない方針。

Reuse しないもの:

- `share_cards` table そのもの。
- `/share/[token]` URL。
- `expires_at` による期限管理。
- token reuse logic。
- 画像付き share payload / image copy flow。

最終判断:

```txt
Commons MVP v0 は commons_cards 別 table で実装する。
share_cards は一時共有 / People Card 交換のために維持する。
Commons では share_cards の snapshot 設計思想だけを reuse し、table と RLS は分離する。
```
