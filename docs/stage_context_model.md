# Stage Context Model

## Purpose

Stage Context は、ユーザーが「あの日へ戻る」ための手がかりである。

Recall Mode はカードを操作する画面ではなく、記憶に静かに浸る体験である。Stage Context はその体験を支えるが、すべての情報をカード本体に詰め込むためのものではない。

カードそのものに必要な情報と、Recall Mode を深めるための任意情報は分けて扱う。必須情報が少ないほど、カードは軽く残せる。任意情報が適切に添えられるほど、後から「あの日」へ戻りやすくなる。

## Classification

### Core Card Data

既存のカード情報。Recall Mode v0 はこの情報だけで成立する。

- `card.createdAt`
- `front`
- `comment`
- `backMemo`
- `image`

### User-entered Stage Data

ユーザーが任意で追加する舞台情報。自動取得よりも手動入力を優先する。

- `location`
- `weather`
- `people`
- `music`
- `lifeEvent`

### Inferred Stage Data

既存情報やユーザー入力から控えめに推測できる情報。原則として保存せず、表示時に生成する。

- `season`
- `timeOfDay`
- `soft stage text`

### External Stage Data

外部サービスや API から得られる舞台情報。導入時は、ユーザー同意、必要性、保存範囲、失敗時の体験を先に設計する。

- weather API
- Spotify / Apple Music
- calendar
- world events

### Reflection Data

複数カードを横断して見えてくる情報。単一カードの編集項目ではなく、将来の Reflection Mode で扱う。

- repeated themes
- values
- changes over time

## Model Table

| Field | Example | Source | Persist? | User Editable? | Required? | Risk / Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `card.createdAt` | `2026-04-12T10:30:00Z` | Core Card Data | Yes, existing card data | No, unless card editing supports it | Yes | Stage v0 の最小素材。日付から年月や季節を生成できる。 |
| `front` | `はじめて海まで歩いた日` | Core Card Data | Yes, existing card data | Yes | No | カードの主役。Stage Engine が意味を決めつけない。 |
| `comment` | `風が強くて、少しだけ怖かった。` | Core Card Data | Yes, existing card data | Yes | No | ユーザー自身の言葉。AI や推測より優先する。 |
| `backMemo` | `あの日の細かい記録...` | Core Card Data | Yes, existing card data | Yes | No | Recall UI では全文を一気に読ませず、静かに読み進める導線にする。 |
| `image` | `card image path` | Core Card Data | Yes, existing card data | Yes | No | 視覚的な記憶の入口。カードが主役であることを支える。 |
| `location` | `鎌倉の海沿い` | User-entered Stage Data | Candidate | Yes | No | 個人情報性がある。自動取得しない。曖昧なラベルで十分な場合が多い。 |
| `weather` | `小雨` | User-entered Stage Data | Candidate | Yes | No | 手動選択を優先。API 由来の場合は同意と保存方針が必要。 |
| `people` | `友人A`, `母` | User-entered Stage Data | Candidate | Yes | No | 個人情報性が高い。自由入力、表示範囲、削除を慎重に扱う。 |
| `music` | `Title / Artist` | User-entered Stage Data | Candidate | Yes | No | 音楽は主役ではない。自動再生しない。外部連携は別責務。 |
| `lifeEvent` | `引っ越し前日` | User-entered Stage Data | Candidate | Yes | No | 感情を決めつけず、ユーザーが付けたラベルを尊重する。 |
| `season` | `春の始まりの頃` | Inferred Stage Data | No by default | Not directly | No | `createdAt` から生成できる。断定しすぎない表現にする。 |
| `timeOfDay` | `夜` | Inferred Stage Data | No by default | Candidate if user-entered | No | `createdAt` の時刻が信頼できない場合がある。推測は弱く扱う。 |
| `softStageText` | `2026年4月。春の始まりの頃。` | Inferred Stage Data | No by default | No | No | 表示時に生成する短い stage text。感情を押し付けない。 |
| `weatherApiSnapshot` | `Tokyo, light rain, 12C` | External Stage Data | Only with consent | Possibly | No | 外部 API 由来。正確性、保存範囲、再取得可否、プライバシーを検討する。 |
| `musicProviderLink` | `spotify:track:...` | External Stage Data | Only with consent | Yes | No | Spotify / Apple Music 連携は Stage Engine とは別責務。音楽を主役にしない。 |
| `calendarContext` | `祝日`, `予定名` | External Stage Data | Only with consent | Yes | No | カレンダーは個人情報性が非常に高い。導入は慎重に行う。 |
| `worldContext` | `当時の大きな出来事` | External Stage Data | Usually no | No or curated | No | 記憶の邪魔にならない粒度にする。ニュース性を強く出しすぎない。 |
| `repeatedThemes` | `旅`, `家族`, `挑戦` | Reflection Data | Candidate in future | Yes or reviewable | No | 複数カードから見える傾向。AI 推測の場合は断定しない。 |
| `values` | `自由`, `安心`, `学び` | Reflection Data | Candidate in future | Yes or reviewable | No | ユーザーの価値観に関わるため、AI が勝手に決めつけない。 |
| `changesOverTime` | `ひとり時間が増えた` | Reflection Data | Candidate in future | Yes or reviewable | No | Reflection Mode 向け。感情や人生解釈の押し付けに注意する。 |

## Persistence Policy

`createdAt` などの既存カード情報は、そのまま Stage Context の素材として使う。

`location`、`weather`、`music`、`people` はユーザー入力を優先する。自動取得や外部連携より、ユーザーが自分で残した言葉を信頼する。

`season`、`timeOfDay`、`softStageText` などの inferred 情報は、原則として保存しない。必要なときに Stage Engine が生成する。

外部 API 由来情報は、保存前にユーザー同意と保存の必要性を確認する。保存しなくても再生成できる情報、または体験上なくても成立する情報は、むやみに永続化しない。

個人情報性が高いものほど慎重に扱う。場所、人、カレンダー、ライフイベント、価値観は、取得、保存、表示、削除のすべてでユーザー制御を優先する。

## Design Rules

Stage Context がなくても Recall Mode は成立する。

Stage Context は、あると体験が深まる補助である。

自動取得より手動入力を優先する。

推測は断定しない。

ユーザーが消せること。

Stage Engine は Context を読むだけで、外部取得はしない。天気 API、音楽サービス、カレンダー連携などは、別の責務として設計する。

## Future Schema Candidate

将来 DB を拡張する場合、`card_stage_metadata` のようなテーブルを検討できる。ただし、今回は実装しない。

候補フィールド:

| Field | Notes |
| --- | --- |
| `card_id` | 対象カードの ID。 |
| `location_label` | ユーザーが任意で入力した場所ラベル。 |
| `weather_label` | ユーザーが任意で入力または選択した天気ラベル。 |
| `music_title` | 手動で紐付けた曲名。 |
| `music_artist` | 手動で紐付けたアーティスト名。 |
| `people_labels` | 人のラベル一覧。個人情報性に注意する。 |
| `life_event_label` | ユーザーが任意で入力したライフイベント。 |
| `created_at` | metadata レコードの作成日時。 |
| `updated_at` | metadata レコードの更新日時。 |

この schema は、Stage Context をカード本体から分離するための候補である。外部 API 由来の詳細データや AI 推測結果を保存する場合は、同意、編集、削除、監査の設計を追加で行う。

## Decision Question

Stage Context に情報を追加するか迷ったときは、次の問いで判断する。

「この情報は、カードを複雑にするためではなく、あの日へ戻るために本当に必要か」
