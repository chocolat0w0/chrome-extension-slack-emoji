# Step 1：Slack登録フォームの調査記録

状態: フォームの一意な識別とmanifestの対象範囲の決定を完了。画像受け渡し・登録は未検証。

## 環境と調査方法

- macOS / Chrome 156.0.8078.79（インストール済みアプリのInfo.plistで確認）。Slack UIは日本語、DOMのlangはja-JP。
- 初回はComputer Use権限不足で停止。ユーザーの許可後、ログイン済みの登録ページを調査できた。
- Chromeのアクセシビリティ情報、DevToolsのElements検索、Consoleでの限定したDOM属性読み取りを使用。認証情報・内部状態・通信内容は取得していない。
- DevToolsを開いた時点でデバイスエミュレーションが有効だった。ページのuserAgentはAndroid / Pixel 10 / Chrome 156 Mobile。DOMの観測にはこの条件が付く。通常のPC表示での再確認はStep 2冒頭で行う。
- Dark Readerと翻訳拡張の追加要素をDOMで確認。この環境の色はSlack標準ダークモードの検証結果とは扱わない。
- ワークスペース名、ホスト固有部分、個人情報は本記録に含めない。画像アップロード・保存・登録は行っていない。

## URLと画面遷移

- 観測URLは `https://<workspace>.slack.com/customize/emoji`。
- 開始時点ですでにページが開かれていたため、到達までのリダイレクト経路は未確認。
- 追加ボタンを押すと同じページにダイアログが開く。開き直し後もpathnameは `/customize/emoji`。
- 入口の表示は「カスタム絵文字を追加する」と「絵文字を追加する」の両方を観測。切り替わる厳密な条件は未確認のため、文言だけに依存しない。
- ダイアログ見出しは「カスタム絵文字を追加する」。キャンセルと閉じるボタンがある。
- 閉じると入力欄がアクセシビリティツリーから消え、開き直すと空の名前欄と無効な保存ボタンが表示された。
- 開き直しでダイアログのUUID形式のidが変わる。idの固定や古いDOM参照の再利用は避ける。

## 確認したDOM

| 対象 | 属性・構造 |
| --- | --- |
| ダイアログ | `role="dialog"`、`aria-modal="false"`、`aria-hidden="false"`、classに `p-add_emoji_dialog` |
| 本文 | `[data-qa="customize_emoji_add_dialog_body"]` |
| フォーム | 本文内の `form.p-add_custom_emoji_dialog__form` |
| ファイル入力 | `input[data-qa="customize_emoji_add_dialog_file_input"]`、idは `emojiimg`、typeは `file`、nameは `img` |
| 受理指定 | `accept="image/*;capture=camera"`、multipleはfalse |
| ファイル選択ボタン | `button[data-qa="customize_emoji_add_dialog_upload"]`、typeはbutton |
| 名前入力 | `input[data-qa="customize_emoji_add_dialog_input"]`、idは `emojiname`、typeはtext、nameはname、aria-labelは「絵文字名」 |
| 名前の補足 | `aria-describedby="emojiname_hint emojiname_character-count"`、placeholderは「アボカド」 |
| 保存ボタン | `button[data-qa="customize_emoji_add_dialog_go"]`、typeはbutton、表示は「保存する」 |
| 閉じるボタン | `button[data-qa="sk_close_modal_button"]`、aria-labelは「閉じる」 |

重要な観測結果:

- Elements検索で `input[type="file"]` はページ内1件。開き直し後も本文、専用ファイル入力、専用名前入力はそれぞれ1件だった。
- 名前入力とファイル入力の `.form` は同じ要素を指していた。
- 初期状態の保存ボタンはアクセシビリティ上「無効」だが、DOMでは `disabled=false`、`aria-disabled="true"`。両方を評価する必要がある。
- 名前入力にmaxlengthとpatternはなかった。min/max属性は0だがtext入力なので文字数制約とは解釈しない。
- 名前入力は初期状態でaria-invalidとaria-requiredがfalse。サーバー側の名前制約や空名の可否はこれらから推測しない。
- アップロードプレビュー用の明暗2つのコンテナがある。画像未選択時のみ確認したため、画像受理後の要素はStep 2で観測する。
- 画面は透過背景・128KB以下・正方形を推奨し、大きすぎる画像はSlackがリサイズすると案内していた。

## 採用する検出方針

以下は観測に基づく実装方針。拡張コードによる検証はStep 2で行う。

1. pathnameを `/customize/emoji` または末尾スラッシュ付きに限定する。
2. 専用data-qa付き本文が一意に存在することを確認する。
3. 祖先のrole=dialogを取得し、表示中でaria-hiddenがtrueではないことを確認する。aria-modal=trueは要求しない。
4. 本文内の専用data-qa付きファイル入力と名前入力が各1件で、同じformに属することを確認する。
5. 保存・閉じるボタンは同じダイアログ内にスコープを限定する。保存可否はdisabledとaria-disabledの両方を確認する。
6. 開閉のたびに要素を再取得する。対象が0件・複数件・切断済みなら操作しない。
7. data-qaはSlackの公開API契約ではなく変更され得る。検出不能時に曖昧な候補へ自動フォールバックしない。

追加フォームのないログイン画面や権限不足画面には取り付けない設計とする。ただし、それらの画面を実際に表示しての検証は未実施。

## manifestの対象範囲

初期版のcontent_scripts.matchesは以下に限定する方針。

```json
[
  "https://*.slack.com/customize/emoji",
  "https://*.slack.com/customize/emoji?*",
  "https://*.slack.com/customize/emoji/",
  "https://*.slack.com/customize/emoji/?*"
]
```

観測したのはクエリなし・末尾スラッシュなし。その他は互換性用の対応方針であり、Chromeへの読み込み時に検証する。複数ワークスペースに利用できるようホストだけをワイルドカード化し、パスは登録ページに限定する。

app.slack.com/client配下の絵文字ピッカーや別管理画面は初期対象外。追加のhost_permissions、cookies、tabs、webRequest権限はこの読み込み方式では要求しない方針。

## Step 2へ持ち越す確認

- デバイスエミュレーションを使わないPC表示で、data-qa・一致数・遷移が同じであること。
- 生成Fileと名前の受理、プレビュー、保存ボタンの有効化。
- 名前の使用可能文字・長さ・重複エラー。HTML属性だけでは確定できない。
- 保存結果の表示場所と、成功を誤認しない判定。
- リダイレクト、ログイン切れ、権限不足は観測可能な範囲で追加調査する。

Step 1の完了はフォーム識別と対象URL範囲の決定を指し、登録経路の成立や全環境の互換性を意味しない。
