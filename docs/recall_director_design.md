# Recall Director Design

## 1. Recall Director とは

Recall Director は、Life Cards v1 の Recall / 思い出す体験を、単なるレイアウトではなく演出として扱うための設計概念である。

`docs/recall_completion_criteria.md` で定義した通り、v1 Recall の目的は、未来の自分が、昔の自分に少し戻れる体験をつくることである。Recall は情報閲覧ではなく、記憶に浸る体験であり、App Store 掲載条件は Recall が完成していることとする。

責務は以下のように分ける。

- Stage Engine は、カードの `createdAt` などから舞台の手がかりを作る。
- Recall Director は、その舞台とカード内容を、どの順番・間・導線で見せるかを決める。
- Recall UI は、Recall Director の結果を画面として表示する。

Recall Director は Presentation Engine とは分ける。

- Recall Director: 自分が一枚のカードを思い出すための演出。
- Presentation Engine: Deck を誰かに贈る上映として編集するための演出。

v1 では Presentation Engine を実装しない。Recall Director は、あくまで一枚のカードと自分自身の再会に閉じる。

## 2. v1 の演出方針

v1 Recall の演出は、静かで、少なく、カードを前に出す。

- カードが主役である。
- 説明しすぎない。
- AI は語らない。
- 操作は少なくする。
- 「あの日の続きを読む」を自然に押したくなる導線にする。
- Back Memo は本編そのものではなく、記憶の奥に入る入口として扱う。

Recall は便利機能の集合ではない。編集、共有、削除、分析、計測のための画面ではなく、カードに少し長く留まるための時間である。

## 3. 体験フロー

v1 の基本フローは以下とする。

1. Recall 起動
2. 暗い舞台に入る
3. カード画像 / Front が静かに出る
4. Comment が補助的に出る
5. Stage 文が当時の空気を添える
6. `あの日の続きを読む` を押す
7. Back Memo の窓が開く
8. 読み終えたら `カードに戻る`
9. 静かに閉じる

このフローの中で、ユーザーは操作方法を学ぶ必要がない状態を目指す。ボタン名、配置、余白、フェードが自然に次の行動を示すことが重要である。

## 4. 間とテンポ

v1 では自動スライドショーにしない。

ただし、画面全体の余白、fade、ボタン位置、Back Memo の窓の大きさによって、急がない体験を作る。情報を一気に読ませるのではなく、少し立ち止まるためのテンポを作る。

演出上の基準は以下とする。

- 画面遷移は速すぎない。
- 表示要素を詰め込みすぎない。
- Back Memo 表示は一気に情報を出さず、読む速度を少し落とす。
- 閉じる操作は常に分かるが、主役になりすぎない。
- 操作ボタンは、回想の流れを壊さない位置と強さにする。

## 5. Back Memo の扱い

Back Memo は全文表示の領域ではなく、「記憶の窓」として扱う。

- 長文は内部スクロールにする。
- 見出しは強くしすぎない。
- 下部フェードで、続きがある感覚を残す。
- Back Memo を読み終えた後、カードそのものに戻りたくなる構造にする。

Back Memo は、カードの答えではない。未来の自分が当時の自分に近づくための奥行きである。Recall Director は、Back Memo を主役にしすぎず、カード画像 / Front / Comment / Stage 文との関係の中で読ませる。

## 6. v1 でやらないこと

v1 Recall では以下をやらない。

- Spotify
- 天気 API
- 位置情報
- Deck 上映
- 贈る
- Reflection
- KPI 計測
- 自動再生
- AI ナレーション

これらは v1 の完成条件ではない。v1 では、既存カード情報だけで「思い出す」を押す意味がある状態を目指す。

## 7. 将来拡張

将来の Recall Director v2 では、createdAt 以外の Stage Context を扱う余地がある。

- 場所
- 天気
- 時間帯
- 音楽

ただし、これらはユーザーの記憶を補助するための素材であり、Recall の主役にはしない。自動取得や外部 API 連携を行う場合は、同意、保存範囲、削除方法、失敗時の体験を先に設計する。

Presentation Engine は、Recall Director とは別の将来構想として扱う。

- Deck 内カードの選出
- Audience / Intent による上映編集
- 最後の本人メッセージ

Presentation Engine は「誰かに見せる」ための編集であり、Recall Director は「自分が思い出す」ための演出である。この境界を混ぜない。

## 8. 実装時の責務分離案

将来コード化する場合、以下の構成を候補とする。

- `src/lib/recallDirector/recallDirector.ts`
- `src/lib/recallDirector/recallScript.ts`
- `src/lib/recallDirector/index.ts`

想定する責務は以下。

- `recallDirector.ts`: カード、Stage Context、表示状態から Recall の見せ方を決める。
- `recallScript.ts`: 表示順、文言、導線、Back Memo の扱いを表す軽い構造を定義する。
- `index.ts`: Recall Director の公開 API をまとめる。

ただし、今回はコード変更しない。v1 では既存 UI の中で完成条件を満たすことを優先し、必要になった時だけ Recall Director をコード化する。
