# Supabase Storage Design

## 目的

Life Cards を PC とスマホで同期できるようにするため、Supabase を保存先として導入する時の設計方針を整理する。

この設計では、Supabase を公開共有サービスではなく、個人のカードを複数端末で扱うための同期ハブとして位置づける。共有機能は将来の別フェーズで検討する。

## 1. Supabase の位置づけ

Supabase は Life Cards の個人同期ハブとして使う。

主な目的:

- PC で作ったカードをスマホで見られるようにする。
- スマホで保存した写真カードを PC でも扱えるようにする。
- localStorage だけでは失われやすいカード、デッキ、再会履歴をクラウド側にも保存する。
- Reencounter Engine が端末をまたいでも同じ履歴を参照できるようにする。

今回の前提:

- 公開共有サービスではない。
- 他人にカードを公開する仕組みではない。
- deck share / public link / collaborative deck は扱わない。
- まずは single user / private sync を優先する。

将来の共有機能は、認可、公開範囲、画像公開 URL、共同編集、削除権限などが絡むため、個人同期とは別設計にする。

## 2. 保存責務

### Supabase Database

Database には構造化データを保存する。

候補 table:

- `users`
- `decks`
- `cards`
- `encounters`

責務:

- ユーザーごとの所有データを管理する。
- deck の一覧と順序を管理する。
- card の本文、所属 deck、favorite などを管理する。
- EncounterMetadata を card 本体から分離して管理する。
- 画像そのものではなく、画像への参照を持つ。

### Supabase Storage

Storage にはカード画像を保存する。

候補 bucket:

- `card-images`

責務:

- アップロード済み画像ファイルを保持する。
- card record から参照可能な path を提供する。
- 将来、画像差し替えや削除時に Database と整合させる。

## 3. 画像保存方針

画像本体は Database に入れない。

Database の `cards` table には、画像を指す参照だけを保存する。

候補 field:

- `imagePath`
- `storagePath`
- `remoteImagePath`
- `localImagePath`

当面は現行 `Card.imagePath` の思想を維持し、Supabase Storage 導入時に `storagePath` へ整理するかを検討する。

画像処理方針:

- アップロード前にクライアント側で WebP 圧縮する。
- 長辺サイズや品質を制限する。
- 元画像をそのまま大量保存しない。
- Database には base64 や binary を入れない。

理由:

- Database の肥大化を避ける。
- 同期速度とコストを抑える。
- Free / Pro どちらでも Storage 容量を読みやすくする。
- PC / スマホ間で同じ画像 path を参照しやすくする。

画像 path の例:

```txt
users/{userId}/cards/{cardId}/front.webp
```

または:

```txt
users/{userId}/card-images/{imageId}.webp
```

削除時は、card record と storage object の cleanup 方針を別途決める。

## 4. 現行 localStorage との関係

現在の保存先:

```txt
life_cards.cards
life_cards.decks
life_cards.encounters
```

現行 localStorage は、MVP のローカル保存として維持する。

将来は Repository を差し替え可能にする。

候補:

```txt
LocalRepository
SupabaseRepository
```

または責務別:

```txt
CardLocalRepository
CardSupabaseRepository
DeckLocalRepository
DeckSupabaseRepository
EncounterLocalRepository
EncounterSupabaseRepository
```

推奨方針:

- UI component は localStorage / Supabase を直接知らない。
- `CardHome` などの上位 orchestrator も、できるだけ repository interface 経由で扱う。
- `ReencounterEngine` は storage を直接読まない。
- Supabase 導入時も、まずは repository adapter の追加として進める。

移行イメージ:

1. localStorage の既存データを読み込む。
2. ログイン後、Supabase 側に未同期データを upsert する。
3. 以後は Supabase を primary、localStorage を cache / offline fallback として扱うか検討する。

## 5. Card 型との関係

Card 型はいきなり大きく壊さない。

現行の `Card` は以下のような軽い構造を持つ。

```ts
type Card = {
  id: string;
  deckId: string;
  imagePath?: string;
  isFavorite?: boolean;
  frontText?: string;
  frontComment?: string;
  backText?: string;
  createdAt: string;
  updatedAt: string;
};
```

当面の方針:

- `imagePath` は維持する。
- Supabase 導入直後に `Card` 型を大きく変更しない。
- Database schema 側では `image_path` または `storage_path` を検討する。
- app 内の `Card.imagePath` へ mapping する adapter を置けるようにする。

将来整理する候補:

- `imagePath`
  - UI が表示に使う抽象的な画像参照。
- `localImagePath`
  - local preview / offline cache 用。
- `remoteImagePath`
  - public URL または signed URL 用。
- `storagePath`
  - Supabase Storage object path。

注意:

- signed URL は期限付きになるため、Card 本体に永続保存する値としては扱いにくい。
- 永続保存するなら `storagePath` を持ち、表示時に URL を解決する方がよい。

## 6. EncounterMetadata 方針

EncounterMetadata は Card 本体に混ぜない。

現行方針:

- Card は記憶の内容。
- EncounterMetadata は閲覧履歴、再会履歴、次回再会予定。
- Reencounter Engine は `Card[]` と metadata map を受け取って判定する。

Supabase でもこの分離を維持する。

候補 table:

```txt
encounters
```

候補 columns:

- `user_id`
- `card_id`
- `first_viewed_at`
- `last_viewed_at`
- `view_count`
- `last_reencounter_at`
- `next_reencounter_at`
- `created_at`
- `updated_at`

重要:

- `cards` table に `last_viewed_at` や `view_count` を直接混ぜない。
- Reencounter Engine は Supabase を直接読まない。
- Repository が Supabase から metadata を読み、Engine に渡す。
- localStorage 版の `life_cards.encounters` と Supabase 版 `encounters` は同じ概念を表す。

## 7. Free / Pro 方針

個人 MVP は Supabase Free で検証する。

Free で検証する範囲:

- 個人利用。
- 少量の画像。
- 少量の card / deck / encounter metadata。
- PC / スマホ間の basic sync。

Pro 前提になりやすい範囲:

- 集団利用。
- 大量画像。
- 複数人での継続利用。
- 共有 deck。
- 画像アップロード頻度が高い使い方。

画像圧縮は必須。

理由:

- Storage 容量が最も早く増える。
- 写真カードは枚数が増えるほど同期コストに効く。
- スマホ回線でも扱いやすいサイズにする必要がある。

初期方針:

- WebP 圧縮。
- 長辺 resize。
- 画質上限を決める。
- 画像の重複アップロードを将来検討する。

## 8. 今回やらないこと

今回は設計ドキュメントのみで、以下は実装しない。

- Supabase SDK 導入。
- package 追加。
- schema 実装。
- migration 実装。
- 認証実装。
- Storage upload 実装。
- 画像圧縮実装。
- 既存 Repository 差し替え。
- localStorage key 変更。
- Card 型変更。
- UI 変更。
- 共有機能。

## 9. 最小実装に進む時の順序案

1. Supabase project と環境変数を用意する。
2. `users`, `decks`, `cards`, `encounters` の最小 schema を決める。
3. Storage bucket `card-images` を作る。
4. Supabase client を infra 層に閉じて追加する。
5. SupabaseRepository を local Repository と同じ interface で作る。
6. まず text-only card / deck / encounter の同期を確認する。
7. 画像 upload と `storagePath` 解決を追加する。
8. localStorage から Supabase への初回 migration flow を設計する。

この順序なら、既存 UX と Reencounter Engine を保ったまま、保存先だけを段階的に増やせる。
