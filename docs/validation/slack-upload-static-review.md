# 検証用拡張の独立した静的監査

担当: サブエージェント Franklin。対象は `spikes/slack-upload/` のmanifest.json、content.js、README.md全体。監査時にファイル変更・ブラウザ操作・拡張読み込み・対象コードの実行は行っていない。

| 主張 | 結果 |
| --- | --- |
| Slack登録ページを読み書きする | 支持。manifestのURL範囲とパス検査で対象を限定し、追加ダイアログを検索、操作パネル・画像・名前を書き込む |
| 外部通信はない | 要修正。拡張自身の直接通信処理はないが、DOMイベントに反応したSlack側の通信は静的監査では否定できない |
| 自動保存はない | 拡張自身の処理について支持。submit、requestSubmit、保存ボタンのclick、永続ストレージ、downloadはない。Slack側の反応は別途実機確認が必要 |

## 根拠

- manifest.jsonはcontent.jsのみをISOLATED worldで宣言。バックグラウンド処理や追加スクリプトはない。
- content.jsのfindFormは専用data-qa付き入力欄と所属フォームを確認する。
- PNGはCanvasで生成し、BlobのオブジェクトURLで表示する。外部スクリプト・画像・CSS・フォントのURLや動的読み込みはない。
- fetch、XHR、WebSocket、Beacon等の直接通信処理はない。
- ファイル欄にchange、名前欄にinput/changeをバブリング付きで送出する。ISOLATED worldでもSlack側のリスナーが反応する可能性がある。
- 監査は拡張自身のソースを対象とする。Slack本体、サーバー、他の拡張の挙動や、実行時の通信・保存を保証するものではない。

## 監査対象の識別

実行コードとmanifestは監査前後で変更していない。READMEと調査記録の説明文のみ、上の結論に合わせて修正した。

```text
SHA-256 manifest.json
37bdb8c6fb1ca84f2c32646482d0778a7eca702cd49a4cf9b43852c0acd6be50
SHA-256 content.js
1f2872b333bcf6ee54496ed39308e5b12ad54ea17087a2ccbb53870a77a239c3
```

正確な説明: この拡張はSlackの絵文字登録ページを読み書きする。拡張自身には直接通信・永続保存・ダウンロード・フォーム送信・保存ボタンの自動クリック処理はない。ただし、入力イベントに反応したSlack側の通信や保存は未検証。
