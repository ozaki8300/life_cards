# Stage Engine Design

## Concept

Stage Engine は、ユーザーが「あの日へ戻る」ための舞台を生成する責務を持つ。

Recall Mode は「浸る」体験である。カードを効率よく読むための画面ではなく、昔の自分に静かに会いに行くための時間である。

Stage Engine は、その前段として、時間、季節、場所、音、空気などの手がかりを整える。カードの内容を説明し尽くすのではなく、記憶が自然に立ち上がるための舞台を用意する。

## What Stage Is

Stage は説明文ではない。

Stage は、ユーザーに特定の感情を押し付けるものではない。「懐かしい」「大切だった」「泣ける」といった感情を決めつけず、ユーザー自身の記憶が動き出す余地を残す。

Stage は、記憶が立ち上がるための手がかりである。日付、季節、時間帯、場所、天気、音楽、人、時代背景などが、過去の空気へ戻る入口になる。

Stage に含まれうるもの:

- 日付
- 季節
- 時間帯
- 場所
- 天気
- 音楽
- 人
- ライフイベント
- 時代背景
- ユーザーが大切にしていた価値観

## Stage Context

Stage Engine は、将来的に以下のような context を扱う。

```ts
type StageContext = {
  date?: {
    createdAt?: string;
    year?: number;
    month?: number;
    day?: number;
  };
  season?: {
    label?: string;
    confidence?: "known" | "inferred" | "unknown";
  };
  timeOfDay?: {
    label?: "morning" | "afternoon" | "evening" | "night";
    source?: "user" | "createdAt" | "inferred";
  };
  location?: {
    label?: string;
    source?: "user" | "imported" | "inferred";
  };
  weather?: {
    label?: string;
    source?: "user" | "api" | "inferred";
  };
  music?: {
    title?: string;
    artist?: string;
    source?: "user" | "linked";
  };
  people?: Array<{
    label: string;
    relationship?: string;
  }>;
  lifeEvent?: {
    label?: string;
    source?: "user" | "inferred";
  };
  worldContext?: {
    label?: string;
    source?: "curated" | "api" | "inferred";
  };
  userValues?: Array<{
    label: string;
    source?: "user" | "inferred";
  }>;
};
```

この構造は、すべてを一度に実装するためのものではない。Stage Engine が将来的に扱う素材の境界を示すための設計メモである。

## Responsibility

Stage Engine は、舞台素材を集め、短い stage text に変換する。

Stage Engine は AI 語りとは分離する。AI が文章を語る前に、どの舞台素材を使うべきかを整えるのが Stage Engine の責務である。

Stage Engine は Spotify 連携とは分離する。音楽情報を stage context に含めることはあっても、再生制御や外部サービス連携そのものは別責務とする。

Stage Engine は天気 API とは分離する。天気を stage context に含めることはあっても、API 取得、キャッシュ、同意管理は別責務とする。

Stage Engine は Recall UI とは分離する。Stage Engine は舞台文や舞台素材を返し、Recall UI はそれをどう表示するかを担当する。

## Roadmap

### v0: Created Date Stage

`createdAt` から年月と季節だけを生成する。外部 API、位置情報、音楽、AI は使わない。

### v1: User-entered Location

ユーザーが任意で場所を入力できるようにする。場所は自動取得しない。入力しなくても Recall Mode は成立する。

### v2: Manual Weather

天気を手動で選択できるようにする。天気は記憶の手がかりであり、必須項目ではない。

### v3: Manual Music / BGM Link

音楽や BGM を手動で紐付けられるようにする。自動再生はしない。音楽は主役ではなく、舞台を支える素材として扱う。

### v4: External API Integration

天気、場所、音楽などの外部 API 連携を検討する。導入時は、ユーザー同意、プライバシー、保存範囲、失敗時の体験を先に設計する。

### v5: AI-assisted Stage

AI による舞台補助を導入する。AI は感情を作るのではなく、既存の stage context から控えめな手がかりを生成する。

### v6: Reflection Mode Connection

複数カードを横断して、人生全体の Reflection Mode へ接続する。Stage Engine は単一カードの舞台だけでなく、時期、変化、繰り返し現れるテーマを支える。

## Design Principles

### 断定しすぎない

Stage text は、ユーザーの記憶を決めつけない。「だったはず」「感じていた」などの過度な推測を避ける。

### 盛りすぎない

舞台は派手な演出ではない。短く、静かに、少しだけ空気を変える。

### 余白を残す

すべてを説明しない。ユーザー自身が思い出すための沈黙と余白を残す。

### プライバシーを尊重する

場所、天気、音楽、人、ライフイベントは個人的な情報になりうる。取得、保存、表示には慎重であるべき。

### ユーザーが制御できる

Stage context はユーザーが追加、修正、削除できることを前提にする。自動推測は、明示的な情報より弱いものとして扱う。

### なくても成立する、あると深まる

Stage Engine の素材は必須ではない。カードだけでも Recall Mode は成立する。舞台情報は、あると体験が深まる補助として扱う。

## Non-goals

Stage Engine は、AI に感動を作らせるための仕組みではない。

天気や音楽を必須にしない。

位置情報を勝手に取らない。

SNS 的な演出にしない。反応、共有、評価、拡散を目的にしない。

ゲーム化しない。達成、報酬、連続記録によって、記憶に浸る体験を邪魔しない。

## Decision Question

Stage Engine に情報を追加するか迷ったときは、次の問いで判断する。

「この情報は、ユーザーを操作させるためではなく、あの日へ戻すために役立つか」
