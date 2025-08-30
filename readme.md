# Logseq Plugin: *URL Hyperlink* 🔗

- This plugin converts URL to markdown; the Logseq standard leaves them as URL.
  > It is the successor of [Automatic URL title](https://github.com/0x7b1/logseq-plugin-automatic-url-title) plugin.

> [!NOTE]
> This plugin works in Logseq db version.

<div align="right">

[English](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink) | [日本語](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/blob/main/readme.ja.md) [![latest release version](https://img.shields.io/github/v/release/YU000jp/logseq-plugin-confirmation-hyperlink)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
[![License](https://img.shields.io/github/license/YU000jp/logseq-plugin-confirmation-hyperlink?color=blue)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/LICENSE)
[![Downloads](https://img.shields.io/github/downloads/YU000jp/logseq-plugin-confirmation-hyperlink/total.svg)](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/releases)
 Published 20230612 <a href="https://www.buymeacoffee.com/yu000japan"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a pizza&emoji=🍕&slug=yu000japan&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff" /></a>
 </div>

## Overview

- Press the Convert button next to the URL and the URL string will be converted to markdown.

  ![17](https://github.com/user-attachments/assets/10ccacc6-d217-45e1-aa58-d64cf3bc3b14)

- If it is an online PDF, download it from its URL and add it to the asset. This is particularly useful for online PDF files that are updated at the same URL.

### Differences with the ‘[URL Title Tagger](https://github.com/imjn/logseq-url-title-tagger)’ plugin

- The ‘URL HyperLink’ plugin requires users to manually click a button. As this is not done automatically, unnecessary chain reactions can be prevented. https://github.com/imjn/logseq-url-title-tagger/issues/7

---

## Getting Started

- Install from Logseq Marketplace
  - Press [`---`] on the top right toolbar to open [`Plugins`]. Select `Marketplace`. Type `URL` in the search field, select it from the search results and install.

### Usage

- **Method 1: Click the convert button**
  - Paste the URL into the block and press Enter or Esc to exit edit mode.
  - Only in non-editing mode, a conversion button appears next to the external link (URL string).
  - Pressing the convert button performs the fetch and if the title can be retrieved from the site, the URL string is converted to markdown.

- **Method 2: Use keyboard shortcut (NEW)**
  - Place the cursor within a block containing a URL
  - Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to convert the URL to a hyperlink
  - Alternatively, use the slash command `/Convert URL to hyperlink` or find it in the command palette
  - **Customize shortcut**: You can change the keyboard shortcut in Logseq's Settings > Keymap > Plugins section

  > If you want to undo it, press `Ctrl + Z` as usual.

### Plugin Settings

- Toggle: Convert to markdown even if the title could not be retrieved from the URL.
- Change icon (or as text)
- Download the online PDF file and add to assets

---

## Showcase / Questions / Ideas / Help

> Go to the [Discussions](https://github.com/YU000jp/logseq-plugin-confirmation-hyperlink/discussions) tab to ask and find this kind of things.

- Can be used in conjunction with
  | Plugin | Description |
  |--------|-------------|
  | [Awesome Links](https://github.com/yoyurec/logseq-awesome-links) | Favicons for external links (with caching) |
  | [Assets Plus](https://github.com/xyhp915/logseq-assets-plus/) | Browse assets. Find documents including PDFs. |


## Prior art & Credit

- Logseq Plugin > [@0x7b1/ automatic url title](https://github.com/0x7b1/logseq-plugin-automatic-url-title)
- Icon > [icooon-mono.com](https://icooon-mono.com/11386-%e3%82%a4%e3%83%b3%e3%82%bf%e3%83%bc%e3%83%8d%e3%83%83%e3%83%88%e3%81%ae%e3%82%a2%e3%82%a4%e3%82%b3%e3%83%b33/)
- Author > [@YU000jp](https://github.com/YU000jp)
