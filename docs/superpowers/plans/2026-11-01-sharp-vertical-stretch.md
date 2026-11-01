# Sharp vertical stretch implementation plan

Goal: 承認済みの直接描画案で、縦伸縮時の画像拡大によるぼやけを除く。
Spec: ../specs/2026-11-01-sharp-vertical-stretch-design.md

- [x] `tests/stretch-browser.js` に長い水平線文字の輪郭テストを追加し、現行実装で失敗を確認する。
- [x] `src/emoji/render.js` で文字メトリクスと輪郭幅から縦範囲を計算し、文字レイヤーの変換後に文字を直接描画する。空白のみの行は縦範囲から除外する。オフの描画を維持する。
- [x] 実Canvasで5書体・3揃え・1〜4行、空行、背景、PNG制約を確認する。既存Node・ブラウザテストを実行する。
- [x] ビルドと配布ZIPを更新し、検証記録を残して差分を確認する。

このセッションで順に実装する。ブランチ／コミット操作は行わず、現在の作業ディレクトリに変更を残す。

結果: 検証記録は `docs/validation/vertical-stretch.md`。独立レビューでも対応が必要な問題は見つからなかった。
