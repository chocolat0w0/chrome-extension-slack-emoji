# Emoji Frames Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 0.8.0に円内へ収まる文字フレームを追加する。
**Architecture:** 安全領域をframes.jsで定義し、layout.jsとrender.jsに渡す。文字と枠を同じ透明レイヤーへ合成してPNG/GIFで共用する。
**Tech Stack:** JavaScript ES modules、Canvas 2D、Node test runner。
**Spec:** docs/superpowers/specs/2026-11-01-emoji-frames-design.md

## Global Constraints
- 128×128px、128,000バイト未満。依存・権限の追加なし。
- 最大4行、縦伸ばし対応。フレームなしは既存描画を維持。

## Review Focus
- 文字の輪郭とアンチエイリアスも円の内側へ収まること。
- 空行と細い記号を含む複数行の縦伸ばし。
- フレーム解除・再マウント時に元の文字揃えが復元されること。
- 集中線と文字が重ならないこと。
- 透過GIFの色と容量、全体バウンド。

### Task 1: 安全領域と描画
**Files:** src/emoji/frames.js, src/emoji/layout.js, src/emoji/render.js, tests/frames.test.js, scripts/build.js
**Interfaces:** frameLayout(frame) -> {x,y,width,height}; drawFrame(ctx,frame,color); fitText(texts,measure,align,area)
- [x] 安全領域と複数行配置のテストを書き、失敗を確認。
- [x] 円・二重丸・集中線の固定形状と安全領域を定義する。線内側から3px以上空け、円に内接する正方形を使用。
- [x] 文字を安全領域へ直接描画。clipも領域に設定し、枠は変換解除後に合成。
- [x] npm testで全件成功を確認。

### Task 2: UIと実Canvas検証
**Files:** src/editor/view.js, tests/frames.html, tests/frames-browser.js
**Interfaces:** frameをrenderEmojiと下書きへ渡す。alignは元の選択を下書きに保持し、描画時のみcenterを使用。
- [x] 実Canvasで円内ピクセル・集中線非重複・GIF・UI復元の検証を作り、失敗を確認。
- [x] フレーム選択と文字揃えの無効化を追加する。
- [x] ブラウザ検証と既存回帰を実行し、サンプルを目視確認。

### Task 3: 配布更新
**Files:** manifest.json, README.md, dist/*, docs/validation/frames.md
- [x] 0.8.0と仕様説明を更新。
- [x] npm test、npm run package、git diff --checkを実行。
- [x] 差分レビューと検証記録を残す。

## Execution record
- Baseline: npm test 10/10 PASS。既存のlinked worktreeを使用。依存追加不要。

- Task 1: 新規テスト2件の失敗を確認後に実装。Node12/12 PASS。
- Task 2: UI未実装時の検証失敗を確認後に実装。最終192 PNG / 6 GIF / UI復元 PASS。
- Ruling: 枠と文字を別Canvasで合成する — 極端な文字変換で枠の描画に差が出たため — Canvasが1枚増える。
- Task 3: 0.8.0配布ZIP、内容照合、差分チェック成功。既存ブラウザ回帰も成功。
- Final review: 独立レビューで重要問題なし。最大文字数ケースは追加済み。
- Final: minor (deferred): フレーム使用中の色変更の専用UIテスト。既存の共通色入力処理を使用。
- 変更はこのworktreeに保持。自動コミット・マージ・pushはしない。
