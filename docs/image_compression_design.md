# Image Compression Design

## 目的

Life Cards の画像保存方針を固定する。

Life Cards の画像は、高精細な作品保存ではなく、カードを見返した時に記憶へ戻るための手がかりとして扱う。スマホやカード表示上で文字や雰囲気が読めることを優先し、保存容量と同期速度を軽く保つ。

## 1. 画像の目的

Life Cards における画像は、作品保存用の原本ではない。

主な目的:

- 再会のきっかけになること。
- 写真、スクショ、板書、会話の断片を思い出せること。
- スマホ画面で文字が読める程度の情報量を保つこと。
- カードの front / back text と組み合わせて、記憶を呼び戻せること。

重視しないこと:

- 原寸保存。
- 高精細アーカイブ。
- 印刷品質。
- RAW / HEIC / PNG 原本の保持。
- 写真作品としての色再現。

方針:

- 画像は「再会の入口」。
- 本当に残したい意味は `frontText`, `frontComment`, `backText` にも残す。
- 画像は軽く、読める範囲で十分にする。

## 2. 推奨圧縮方針

基本方針:

- 長辺: 1200〜1600px
- 形式: WebP
- quality: 0.65〜0.75
- 目標サイズ: 100〜300KB / 枚

理由:

- スマホ表示では 1200〜1600px あれば多くのカード画像は十分読める。
- WebP は写真とスクショの両方で容量を抑えやすい。
- 100〜300KB 程度なら Supabase Storage やモバイル通信でも扱いやすい。
- 元画像を base64 で localStorage に保存し続けるよりも、同期・保存・読み込みの負担が小さい。

圧縮後も守りたいこと:

- スクショ内の主要文字が読める。
- 写真の主題が判別できる。
- カード背景として見た時に不自然に荒れすぎない。
- 詳細写真モードで拡大しても最低限の確認ができる。

## 3. 用途別設定案

### 写真中心

推奨:

- 長辺: 1200px
- WebP quality: 0.65
- 目標: 100〜220KB / 枚

対象:

- 風景写真
- 人物や物の写真
- 雰囲気を思い出すための画像
- 文字が主目的ではないカード

理由:

- 写真は多少圧縮しても記憶の手がかりとして成立しやすい。
- カード背景として使う場合、容量削減の効果が大きい。

### スクショ・文字中心

推奨:

- 長辺: 1600px
- WebP quality: 0.75
- 目標: 180〜300KB / 枚

対象:

- スクリーンショット
- スライド
- 板書
- メモ画像
- ChatGPT や記事の画面
- 文字が読めることが重要なカード

理由:

- 小さい文字は圧縮で読みにくくなりやすい。
- 文字中心画像は写真より高めの解像度と quality を確保する。

## 4. 現行実装との関係

現状:

- `CardForm` は画像選択後、`FileReader.readAsDataURL` で base64 data URL を生成している。
- 生成した data URL を `imagePath` として扱っている。
- `Card` 型は `imagePath?: string` を持つ。

当面の方針:

- `Card` 型はまだ変えない。
- `imagePath` は当面維持する。
- 画像選択後、将来はそのまま base64 化せず、圧縮処理を通してから `imagePath` に入れる。
- localStorage 保存中は、圧縮済み data URL を `imagePath` に入れる案もあり得る。
- Supabase 移行後は、`imagePath` を storage path または解決済み表示 URL へ map する adapter を検討する。

将来の処理順案:

```txt
画像選択
↓
画像種別を判定、またはユーザー選択
↓
Canvas / browser API で resize
↓
WebP 化
↓
preview 表示
↓
localStorage または Supabase Storage へ保存
↓
Card.imagePath には参照を保持
```

注意:

- いきなり `Card` 型に `storagePath` などを追加しない。
- まずは圧縮済み画像を既存 `imagePath` 経由で扱えるかを検証する。
- 画像処理は UI の入力体験を大きく変えないように差し込む。

## 5. Supabase との関係

Supabase Storage に入れる前に画像を圧縮する。

方針:

- Supabase Database に画像本体は入れない。
- Database には `storagePath` 相当の参照だけを保存する。
- Storage には圧縮済み WebP を保存する。
- original file は原則アップロードしない。

Supabase 設計との整合:

- `cards` table は本文や deck 所属などの構造化データを持つ。
- `card-images` bucket は画像ファイルを持つ。
- `encounters` table は再会履歴を持つ。
- Reencounter Engine は画像保存先を直接知らない。

保存 path の候補:

```txt
users/{userId}/cards/{cardId}/front.webp
```

または:

```txt
users/{userId}/card-images/{imageId}.webp
```

運用上の注意:

- 画像削除は card 削除とは別途 cleanup 方針が必要。
- 画像差し替え時に古い Storage object を消すか残すかを決める。
- signed URL を永続保存せず、永続値は `storagePath` に寄せる。

## 6. 今回やらないこと

今回は設計メモのみで、以下は実装しない。

- 圧縮コード実装。
- Canvas / WebCodecs / browser image API の実装。
- package 追加。
- Supabase SDK 導入。
- Supabase Storage upload 実装。
- Card 型変更。
- Repository 差し替え。
- localStorage key 変更。
- UI 変更。
- 画像削除 cleanup 実装。

## 7. 最小実装に進む時の順序案

1. `compressImage(file, options)` の小さな utility を作る。
2. 写真用 default と文字用 default の preset を定義する。
3. `CardForm` の画像選択後に圧縮処理を挟む。
4. まずは圧縮済み data URL を既存 `imagePath` に入れる。
5. Supabase Storage 導入時に、圧縮済み Blob を upload し、`storagePath` を保存する。
6. local preview / remote storage path の整理を後続で行う。

この順序なら、Card 型と UI を大きく動かさず、保存容量だけを先に改善できる。
