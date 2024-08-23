import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { convertUrlToMarkdownLink, getTitleFromURL } from './URL'
import { checkDemoGraph, includeTitle } from './lib'
import { settingsTemplate } from './settings'
import ja from "./translations/ja.json"
import af from "./translations/af.json"
import de from "./translations/de.json"
import es from "./translations/es.json"
import fr from "./translations/fr.json"
import id from "./translations/id.json"
import it from "./translations/it.json"
import ko from "./translations/ko.json"
import nbNO from "./translations/nb-NO.json"
import nl from "./translations/nl.json"
import pl from "./translations/pl.json"
import ptBR from "./translations/pt-BR.json"
import ptPT from "./translations/pt-PT.json"
import ru from "./translations/ru.json"
import sk from "./translations/sk.json"
import tr from "./translations/tr.json"
import uk from "./translations/uk.json"
import zhCN from "./translations/zh-CN.json"
import zhHant from "./translations/zh-Hant.json"
import { parseBlockForLink } from './parse'

// Key
export const key = "confirmHyperlink"

// State
let demoGraph: boolean = false
let onBlockChangedToggle: boolean = false
let processing: Boolean = false // ロック用フラグ
let processingForButton: Boolean = false
let currentSetURL: string = ""


export const setURL = (change: string): string => {
    if (change !== "")
        currentSetURL = change
    return currentSetURL
}



/* main */
const main = async () => {

    await l10nSetup({
        builtinTranslations: {//Full translations
            ja, af, de, es, fr, id, it, ko, "nb-NO": nbNO, nl, pl, "pt-BR": ptBR, "pt-PT": ptPT, ru, sk, tr, uk, "zh-CN": zhCN, "zh-Hant": zhHant
        }
    })
    /* user settings */
    logseq.useSettingsSchema(settingsTemplate())

    if (!logseq.settings)
        setTimeout(() =>
            logseq.showSettingsUI(), 300)

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
                background-color: var(--ls-primary-background-color);
                color: var(--ls-primary-text-color);
                boxShadow: 1px 2px 5px var(--ls-secondary-background-color);
            }

            & button {
                &#hyperlinkButton {
                    font-size: 2em;
                    font-family: "tabler-icons";
                    padding: 0;
                }

                &:hover {
                    background-color: var(--ls-secondary-background-color);
                }
            }
        }
    }
    `)


    //ページ読み込み時
    logseq.App.onPageHeadActionsSlotted(async () => {
        isDemoGraph()
    })

    //グラフ変更時
    logseq.App.onCurrentGraphChanged(async () => {
        isDemoGraph()
    })

    if (demoGraph === false) {
        onBlockChanged()
        onBlockChangedToggle = true
    }

    logseq.Editor.registerBlockContextMenuItem(t("Create Hyperlink"), async ({ uuid }) => {
        if (processing === true)
            return
        processing = true // ロックをかける

        const block = await logseq.Editor.getBlock(uuid, { includeChildren: false }) as { uuid: BlockEntity["uuid"], content: BlockEntity["content"], format: BlockEntity["format"] } | null
        if (block)
            await parseBlockForLink(block.uuid, block.content, block.format)

        processing = false // ロックを解除する
        return
    })

}/* end_main */



const isDemoGraph = async () => {
    demoGraph = await checkDemoGraph() as boolean
    if (demoGraph === true
        && onBlockChangedToggle === false) {
        onBlockChanged()
        onBlockChangedToggle = true
    }
}


const onBlockChanged = () =>
    logseq.DB.onChanged(async ({ blocks, txMeta }) => {

        if (//!(txMeta?.outlinerOp) //アウトライナー操作のみ
            logseq.settings!.bulletMenuOnly === true // バレットメニューのみの設定項目がtrueの場合
            || demoGraph === true //デモグラフの場合は処理しない
            || processing === true // 重複を避ける
            || (txMeta
                && (txMeta["transact?"] === false //ユーザー操作ではない場合 (transactは取引の意味)
                    || txMeta?.outlinerOp === "delete-blocks")) //ブロックが削除された場合
            || (parent.document.getElementById(`${logseq.baseInfo.id}--${key}`) as HTMLDivElement | null) !== null //ポップアップが表示されている場合は処理しない
        ) return

        // ターゲットブロックを取得
        const targetBlock = blocks.find((block) =>
            block.page
            && block.content
            && block.content !== ""
        ) as {
            uuid: BlockEntity["uuid"],
            content: BlockEntity["content"],
            format: BlockEntity["format"]
        } | null

        if (!targetBlock)
            return

        // カーソル位置のブロックを取得
        const currentBlock = await logseq.Editor.getCurrentBlock() as { uuid: BlockEntity["uuid"] } | null
        if (!currentBlock
            || targetBlock.uuid !== currentBlock.uuid)
            return

        // ロックをかける
        processing = true
        // ロックを解除する (処理中断対策)
        setTimeout(() => processing = false, 300)

        // リンクを作成
        await parseBlockForLink(targetBlock.uuid, targetBlock.content, targetBlock.format)

        // ロックを解除する
        setTimeout(() => processing = false, 100)
    })


export const showDialog = (
    url: string,
    uuid: string,
    left: string,
    top: string,
    text: string,
    formatSettings: {
        formatBeginning: string
        applyFormat: (title: any, url: any) => string
    }
) => {

    setURL("")

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
                    </div>
                    <style>
                    body>div {
                        &#root>div {
                            &.light-theme>main>div span#dot-${uuid} {
                                outline: 2px solid var(--ls-link-ref-text-color);
                            }
                            &.dark-theme>main>div span#dot-${uuid} {
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

        //タイトル取得ボタン
        const divElement = parent.document.getElementById("hyperlink") as HTMLDivElement
        if (divElement)
            divElement.addEventListener("mouseover", async () => {
                if (processingForButton)
                    return
                processingForButton = true
                setTimeout(() =>
                    processingForButton = false
                    , 100)

                const title = await getTitleFromURL(url)

                console.log(title) //TODO:

                console.log(decodeURI(title))



                const elementTitle = parent.document.getElementById("hyperlinkTitle") as HTMLInputElement
                if (title
                    && elementTitle)
                    elementTitle.value = includeTitle(title)
                elementTitle.disabled = false

                //実行ボタンを表示
                const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement | null
                if (button)
                    button.style.display = "inline"

            }, { once: true })

        //実行ボタン
        const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement
        if (button)
            button.addEventListener("click", async () => {
                if (processingForButton)
                    return
                processingForButton = true

                const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value
                if (!inputTitle)
                    return

                const block = await logseq.Editor.getBlock(uuid, { includeChildren: false }) as { uuid: BlockEntity["uuid"] } | null
                if (block) {
                    const updatedTitle = convertUrlToMarkdownLink(inputTitle, url, text, formatSettings.applyFormat)
                    if (updatedTitle)
                        logseq.Editor.updateBlock(uuid, updatedTitle)
                } else
                    logseq.UI.showMsg(t("Error: Block not found"), "warning")

                //実行されたらポップアップを削除
                const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null
                if (element)
                    element.remove()
                currentSetURL = ''

                processingForButton = false
            })
    }, 100)
}

logseq.ready(main).catch(console.error)
