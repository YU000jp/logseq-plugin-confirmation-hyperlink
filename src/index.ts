import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { DEFAULT_REGEX, convertUrlToMarkdownLink, getFormatSettings, getTitleFromURL, isAlreadyFormatted, isImage, isPDF, isWrappedIn } from './URL'
import { convertOnlinePDF } from './convertOnlinePDF'
import { checkDemoGraph, includeTitle } from './lib'
import { settingsTemplate } from './settings'
import ja from "./translations/ja.json"

const key = "confirmHyperlink"
let demoGraph: boolean = false
let onBlockChangedToggle: boolean = false
let processing: Boolean = false // ロック用フラグ
let setURL = ""

/* main */
const main = async () => {
    await l10nSetup({ builtinTranslations: { ja } })
    /* user settings */
    logseq.useSettingsSchema(settingsTemplate())
    if (!logseq.settings) setTimeout(() => logseq.showSettingsUI(), 300)

    //CSS text-overflow
    //https://developer.mozilla.org/ja/docs/Web/CSS/text-overflow
    logseq.provideStyle(`
    body>div[data-ref="confirmation-hyperlink"] {
        & div#hyperlink {
            & p {
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                margin: unset;
            }

            & input {
                background: var(--ls-primary-background-color);
                color: var(--ls-primary-text-color);
                boxShadow: 1px 2px 5px var(--ls-secondary-background-color);
            }

            & button {
                &#hyperlinkButtonGetTitle {
                    font-size: .9em;
                }
                &#hyperlinkButton {
                    font-size: 2em;
                    font-family: "tabler-icons";
                    padding: 0;
                }

                &:hover {
                    background: var(--ls-secondary-background-color);
                }
            }
        }
    }
    `)


    //ページ読み込み時
    logseq.App.onPageHeadActionsSlotted(async () => {
        demoGraph = await checkDemoGraph() as boolean
        if (demoGraph === true && onBlockChangedToggle === false) {
            onBlockChanged()
            onBlockChangedToggle = true
        }
    })

    //グラフ変更時
    logseq.App.onCurrentGraphChanged(async () => {
        demoGraph = await checkDemoGraph() as boolean
        if (demoGraph === true && onBlockChangedToggle === false) {
            onBlockChanged()
            onBlockChangedToggle = true
        }
    })

    if (demoGraph === false) {
        onBlockChanged()
        onBlockChangedToggle = true
    }

    logseq.Editor.registerBlockContextMenuItem(t("Create Hyperlink"), async ({ uuid }) => {
        if (processing === true) return
        const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null
        if (block) {
            processing = true // ロックをかける
            await parseBlockForLink(block.uuid, block.content, block.format)
        }
        processing = false // ロックを解除する
        return
    })

}/* end_main */



const onBlockChanged = () => logseq.DB.onChanged(async ({ blocks, txMeta }) => {

    if (//アウトライナー操作のみ
        !(txMeta?.outlinerOp)
        // バレットメニューのみの設定項目がtrueの場合
        || logseq.settings!.bulletMenuOnly === true
        //デモグラフの場合は処理しない
        || demoGraph === true
        // 重複を避ける
        || processing === true
        //ポップアップが表示されている場合は処理しない
        || (parent.document.getElementById(`${logseq.baseInfo.id}--${key}`) as HTMLDivElement | null) !== null
    ) return
    // ターゲットブロックを取得
    const targetBlock = blocks.find((block) => block.page && block.content && block.content !== "") as BlockEntity | null
    if (!targetBlock) return
    // カーソル位置のブロックを取得
    const currentBlock = await logseq.Editor.getCurrentBlock() as BlockEntity | null
    if (!currentBlock || targetBlock.uuid !== currentBlock.uuid) return
    // ロックをかける
    processing = true
    // リンクを作成
    await parseBlockForLink(targetBlock.uuid, targetBlock.content, targetBlock.format)
    // ロックを解除する
    processing = false
})


export const showDialog = (url: string, uuid: string, left: string, top: string, text: string, formatSettings: { formatBeginning: string; applyFormat: (title: any, url: any) => string }) => {
    logseq.provideUI({
        attrs: {
            title: url,
        },
        key,
        close: "outside",
        replace: true,
        reset: true,
        template: `
                    <div id="hyperlink">
                        <p>
                            <input id="hyperlinkTitle" type="text" style="width:450px" disabled="true" title="${t("Title")}" placeholder="${t("Get the title")}"/>
                            <button id="hyperlinkButton" title="${t("Submit")}">&#xed00;</button>
                        </p>
                        <button id="hyperlinkButtonGetTitle"></button>
                    </div>
                    <style>
                    body>div {
                        &#root>div {
                            &.light-theme>main>div span#dot-${uuid}{
                                outline: 2px solid var(--ls-link-ref-text-color);
                            }
                            &.dark-theme>main>div span#dot-${uuid}{
                                outline: 2px solid aliceblue;
                            }
                        }
                        &[data-ref="confirmation-done-task"] div#hyperlink button#hyperlinkButton {
                            display: none;
                        }
                    }
                    </style>
                    `,
        style: {
            width: "unset",
            maxWidth: "550px",
            left,
            top,
            paddingLeft: "0.4em",
            backgroundColor: 'var(--ls-primary-background-color)',
            color: 'var(--ls-primary-text-color)',
            boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
        },
    })
    setTimeout(() => {
        let processing: Boolean = false

        //タイトル取得ボタン
        const divElement = parent.document.getElementById("hyperlink") as HTMLDivElement
        if (divElement) {
            divElement.addEventListener("mouseover", async () => {
                if (processing) return
                processing = true
                const title = await getTitleFromURL(url)
                const elementTitle = parent.document.getElementById("hyperlinkTitle") as HTMLInputElement
                if (title && elementTitle) elementTitle.value = includeTitle(title)
                elementTitle.disabled = false
                //タイトルボタンを消す
                const elementButtonGetTitle = parent.document.getElementById("hyperlinkButtonGetTitle") as HTMLButtonElement | null
                if (elementButtonGetTitle) elementButtonGetTitle.remove()
                //実行ボタンを表示
                const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement | null
                if (button) button.style.display = "inline"
                processing = false
            }, { once: true })
        }

        //実行ボタン
        const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement
        if (button) {
            button.addEventListener("click", async () => {
                if (processing) return
                processing = true
                const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value
                if (!inputTitle) return
                const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null
                if (block) {
                    const updatedTitle = convertUrlToMarkdownLink(inputTitle, url, text, formatSettings.applyFormat)
                    if (updatedTitle) logseq.Editor.updateBlock(uuid, updatedTitle)
                } else {
                    logseq.UI.showMsg(t("Error: Block not found"), "warning")
                }
                //実行されたらポップアップを削除
                const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null
                if (element) element.remove()
                setURL = ''
                processing = false
            })
        }
    }, 100)
}

export const showDialogForPDF = (url: string, uuid: string, left: string, right: string, top: string) => {
    logseq.provideUI({
        attrs: {
            title: url,
        },
        key,
        close: "outside",
        reset: true,
        replace: true,
        template: `
                    <div id="hyperlink">
                        <p>
                            <input id="hyperlinkTitle" type="text" style="width:450px" value="${url.split("/").pop() as string}" title="${t("Edit the title of online PDF")}" placeholder="${t("Edit the title of online PDF")}"/>
                            <button id="hyperlinkButton" title="${t("Submit")}">&#xed00;</button>
                        </p>
                    </div>
                    <style>
                    body>div#root>div {
                        &.light-theme>main>div span#dot-${uuid}{
                            outline: 2px solid var(--ls-link-ref-text-color);
                        }
                        &.dark-theme>main>div span#dot-${uuid}{
                            outline: 2px solid aliceblue;
                        }
                    }
                    </style>
                    `,
        style: {
            width: "unset",
            maxWidth: "550px",
            left: (left !== "") ? left : "unset",
            right: (right !== "") ? right : "unset",
            top,
            paddingLeft: "0.4em",
            backgroundColor: 'var(--ls-primary-background-color)',
            color: 'var(--ls-primary-text-color)',
            boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
        },
    })
    setTimeout(() => {
        let processing: Boolean = false
        const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement
        if (button) {
            button.addEventListener("click", async () => {
                if (processing) return
                processing = true
                const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value
                if (!inputTitle) return
                const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null
                if (block) {
                    await convertOnlinePDF(url, uuid, inputTitle)
                } else {
                    logseq.UI.showMsg(t("Error: Block not found"), "warning")
                }
                //実行されたらポップアップを削除
                const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null
                if (element) element.remove()
                processing = false
                setURL = ''
            })
        }
    }, 100)
}

export const parseBlockForLink = async (uuid: string, content: string, format: string) => {
    if (!uuid || !content) return
    const urls = content.match(DEFAULT_REGEX.line) as RegExpMatchArray | null
    if (!urls) return
    if (parent.document.getElementById(`${logseq.baseInfo.id}--${key}`) as HTMLDivElement | null === null) setURL = ""

    const formatSettings = await getFormatSettings(format) as { formatBeginning: string; applyFormat: (title: any, url: any) => string }
    if (!formatSettings) return
    let offset = 0
    for (const url of urls) {
        const urlIndex = content.indexOf(url, offset) as number
        if (isAlreadyFormatted(content, urlIndex, formatSettings.formatBeginning) || isImage(url) || isWrappedIn(content, url)) continue

        if (setURL === url) return
        setURL = url
        const blockElement = parent.document.getElementsByClassName(uuid)[0] as HTMLElement
        let top = ""
        let left = ""
        let right = ""
        //エレメントから位置を取得する
        const rect = (blockElement) ? blockElement.getBoundingClientRect() as DOMRect | undefined : null

        if (blockElement && rect) {
            const offsetTop = Number(rect.top - 100)
            top = (offsetTop > 0) ?
                Number(offsetTop) + "px"
                : Number(rect.top) + "px"

            left = String(rect.left) + "px"
            const offsetRight = Number(rect.right - 300)
            right = (offsetRight > 0) ?
                String(rect.right) + "px"
                : "1em"
            right = ""
        } else {
            top = ".3em"
            right = "1em"
        }

        if (logseq.settings!.onlinePDF === true && isPDF(url)) {
            showDialogForPDF(url, uuid, left, right, top)
        } else {
            showDialog(url, uuid, left, top, content, formatSettings)
        }
    }
    setURL = ""
}


logseq.ready(main).catch(console.error)