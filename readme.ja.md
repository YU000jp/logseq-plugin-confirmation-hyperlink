# Logseq Plugin: *URL Hyperlink* 🔗

- このプラグインはURLをマークダウンに変換します。Logseq標準はURLのままです。
  > このプラグインは [Automatic URL title](https://github.com/0x7b1/logseq-plugin-automatic-url-title) プラグインの後継です。

> [!NOTE]
> このプラグインはLogseq db版で動作します。

<div align="right">

[English](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink) | [日本語](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/blob/main/readme.ja.md)
[![最新リリースバージョン](https://img.shields.io/github/v/release/YU000jp/logseq-plugin-confirmation-hyperlink)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
[![ライセンス](https://img.shields.io/github/license/YU000jp/logseq-plugin-confirmation-hyperlink?color=blue)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/LICENSE)
[![ダウンロード数](https://img.shields.io/github/downloads/YU000jp/logseq-plugin-confirmation-hyperlink/total.svg)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
 公開日 2023/06/12 <a href="https://www.buymeacoffee.com/yu000japan"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a pizza&emoji=🍕&slug=yu000japan&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff" /></a>
 </div>

## 概要

- URL横の変換ボタンを押すと、URL文字列はマークダウンに変換されます。

  > ![17](https://github.com/user-attachments/assets/10ccacc6-d217-45e1-aa58-d64cf3bc3b14)

- (オプション) オンラインPDFの場合は、そのURLからダウンロードしてアセットに追加します。これは、同じURLで更新されるオンラインPDFファイルの場合に特に便利です。

### プラグイン「[URL Title Tagger](https://github.com/imjn/logseq-url-title-tagger)」との違い

- 「URL HyperLink」プラグインは、ユーザーが手動でボタンをクリックする必要があります。自動で変換が行われないため、不要な連鎖を防げます。https://github.com/imjn/logseq-url-title-tagger/issues/7

---

## 始め方

- Logseq マーケットプレイスからインストール
  - 右上のツールバーで [`---`] をクリックして [`プラグイン`] を開きます。`URL`を検索フィールドに入力し、検索結果から選択してインストールします。

### 使用方法

- ブロックにURLを貼り付け、Enterキーを押して編集モードを終了します。
- 編集モードを解除すると、外部リンク（URL文字列）の横に変換ボタンが表示されます。
- 変換ボタンを押すとfetchが実行され、タイトルをサイトから取得できる場合に、URL文字列はマークダウンに変換されます。
  > もし、元に戻す場合は通常どおり、Ctrl + Zを押してください。

### プラグイン設定

- トグル： タイトルがURLから取得できなかった場合でも、マークダウンに変換します。
- アイコンの変更（またはテキストとして）

---

## ショーケース / 質問 / アイデア / ヘルプ

> [ディスカッション](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/discussions) タブに移動して、この種の情報を質問および見つけてください。

- 次のプラグインを併用できます
  | プラグイン名 | 説明 |
  | --- | --- |
  | [Awesome Links](https://github.com/yoyurec/logseq-awesome-links) | 外部リンクのファビコン（キャッシュ付き） |
  | [Assets Plus](https://github.com/xyhp915/logseq-assets-plus/) | アセットを閲覧。PDFを含むドキュメントを検索します。 |

## 先行技術とクレジット

- Logseq プラグイン > [@0x7b1/ automatic url title](https://github.com/0x7b1/logseq-plugin-automatic-url-title)
- アイコン > [icooon-mono.com](https://icooon-mono.com/11386-%e3%82%a4%e3%83%b3%e3%82%bf%e3%83%bc%e3%83%8d%e3%83%83%e3%83%88%e3%81%ae%e3%82%a2%e3%82%a4%e3%82%b33/)
- 製作者 > [@YU000jp](https://github.com/YU000jp)
