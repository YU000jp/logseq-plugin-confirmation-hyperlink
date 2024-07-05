# Logseq Plugin: *URL Hyperlink* 🔗

- このプラグインは、URLをマークダウンに変換します。Logseq 標準では URL として残されます。
  > このプラグインは [Automatic URL title](https://github.com/0x7b1/logseq-plugin-automatic-url-title) プラグインの後継です。

<div align="right">

[English](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink) | [日本語](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/blob/main/readme.ja.md)
[![最新リリースバージョン](https://img.shields.io/github/v/release/YU000jp/logseq-plugin-confirmation-hyperlink)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
[![ライセンス](https://img.shields.io/github/license/YU000jp/logseq-plugin-confirmation-hyperlink?color=blue)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/LICENSE)
[![ダウンロード数](https://img.shields.io/github/downloads/YU000jp/logseq-plugin-confirmation-hyperlink/total.svg)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
 公開日 2023/06/12 <a href="https://www.buymeacoffee.com/yu000japan"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a pizza&emoji=🍕&slug=yu000japan&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff" /></a>
 </div>

## 概要

- 1. URLをブロックのどこかに貼り付けます。ダイアログが表示されます。タイトルはその場で編集できます。URL を変換する必要がない状況をサポートします。

   ![画像](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/assets/111847207/e4ca591a-b6bb-4077-bd5d-4e42b184cb53)

- オンラインPDFの場合、そのURLからダウンロードしてアセットにインポートします。
  > Logseq標準ではこの機能はありません。同じURLで更新されるオンラインPDFファイルに特に便利です。

---

## 始め方

- Logseq マーケットプレイスからインストール
  - 右上のツールバーで [`---`] をクリックして [`プラグイン`] を開きます。`URL`を検索フィールドに入力し、検索結果から選択してインストールします。

### 使用方法

  - URLを貼り付けると、そのダイアログが表示されます。
     > *ダイアログが表示されない場合*、弾丸のコンテキストメニューから「ハイパーリンクの作成」アイテムを呼び出してください。

### プラグイン設定

- 弾丸のコンテキストメニューから呼び出された場合のみ、URLを貼り付けた場合は何もしません。: boolean 🆕
  - デフォルトは `false`
  - `true`
- オンラインPDFファイルをダウンロードしてアセットに追加: boolean 🆕
  - デフォルトは `true`
  - `false`

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
