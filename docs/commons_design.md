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
  image_path text,
  image_url text,
  image_fit_mode text,
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
  - 画像参照。Storage 方針が固まるまでは片方に寄せず、設計上の選択肢として残す。
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
