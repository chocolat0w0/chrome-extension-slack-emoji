# Step 6：個人利用向け配布準備

状態: 配布ZIP・手順書・最終チェックを整備。新規Chromeプロファイルによる検証はユーザー指定で省略。

## 成果物

- `dist/manifest.json`、`dist/content.js`: Chromeの読み込み用。
- `releases/slack-emoji-0.1.0.zip`: 配布用。ZIPの中は上記2ファイルのみ。
- 同ZIPの `.sha256`: 配布物の照合用。
- README: 導入・使い方・更新・無効化・対応範囲・データ処理・ビルド方法・検証手順。
- `scripts/package.py`: 固定日時・固定ファイル順で再現可能なZIPを作成し、展開内容がdistと一致することを確認。

## 最終チェック

- Node標準テスト2件成功。
- ビルドと配布ZIP生成成功。
- 実行スクリプトの構文チェック成功。
- manifestの内容がソースと一致。追加permissions・host_permissions・backgroundなし、ISOLATED world、Slack登録ページ限定。
- distとZIPが2ファイルだけであること、ZIP破損なし、内容のバイト単位一致を確認。
- 実行コードはStep 5の再読み込み後の実Slack確認から変更していない。ブラウザ統合10項目・回帰9項目・Canvas8ケースの結果は既存検証記録を参照。

バージョン0.1.0のZIP SHA-256:

`2f9df1ccd1ac2ac89a17b1ee268b751d155bf6e6c74a9b0c3312cdb882e5c6c6`

新しいプロファイルへの導入、別OS・実Slack英語UI・実Slack異常系の未確認事項は継続して記録する。Chrome Web Store公開は対象外。ZIPはGit対象外の生成物、distはGitに含める。今回の作業はmainへ1回のローカルコミットにまとめる。
