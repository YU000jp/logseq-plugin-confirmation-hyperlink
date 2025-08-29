import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { getTitleFromURL } from './getTitle'
import { settingsTemplate } from './settings'
import af from "./translations/af.json"
import de from "./translations/de.json"
import es from "./translations/es.json"
import fr from "./translations/fr.json"
import id from "./translations/id.json"
import it from "./translations/it.json"
import ja from "./translations/ja.json"
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
import { getContentFromUuid, getContentFromUuidForDb } from './query/advancedQuery'
import { logseqModelCheck } from './logseqModelCheck'

// 変数 (同じモジュール内で使用するため、exportしない)
let logseqVersion: string = "" //バージョンチェック用
let logseqMdModel: boolean = false //モデルチェック用
// 外部から参照するためにexportする
export const replaceLogseqVersion = (version: string) => logseqVersion = version
export const replaceLogseqMdModel = (mdModel: boolean) => logseqMdModel = mdModel

const main = async () => {
    // Logseqモデルのチェックを実行
    const [logseqMdModel] = await logseqModelCheck()
    // 初期ロード
    await initializePlugin(logseqMdModel)
}

const initializePlugin = async (logseqMdModel: boolean) => {
    await setupTranslations()
    setupUserSettings()
    setupEventListeners()
    setTimeout(() => observeMainContent(), 500)
}

const setupTranslations = async () => {
    await l10nSetup({
        builtinTranslations: {
            ja, af, de, es, fr, id, it, ko, "nb-NO": nbNO, nl, pl, "pt-BR": ptBR, "pt-PT": ptPT, ru, sk, tr, uk, "zh-CN": zhCN, "zh-Hant": zhHant
        }
    })
}

const setupUserSettings = () => {
    logseq.useSettingsSchema(settingsTemplate())
    const updateInfo = "20250323a"
    if (!logseq.settings)
        setTimeout(() => logseq.showSettingsUI(), 300)
    else
        if (logseq.settings!.updateInfo !== updateInfo) {
            setTimeout(() => logseq.showSettingsUI(), 300)
            logseq.updateSettings({ updateInfo })
        }
}

const setupEventListeners = () => {
    logseq.App.onSidebarVisibleChanged(async ({ visible }) => {
        if (visible) mutationCallback()
    })

    logseq.beforeunload(async () => {
        resetAll()
    })

    // Register the keyboard shortcut command
    logseq.Editor.registerSlashCommand(
        'Convert URL to hyperlink',
        async () => {
            await handleKeyboardShortcut()
        }
    )

    // Register keyboard shortcut via command palette
    logseq.App.registerCommandPalette(
        {
            key: 'convert-url-hyperlink',
            label: 'Convert URL to hyperlink'
        },
        async () => {
            await handleKeyboardShortcut()
        }
    )

    // Try to register the keyboard shortcut
    try {
        const shortcutKey = (logseq.settings?.keyboardShortcut as string) || 'mod+shift+l'
        logseq.App.registerCommandShortcut(
            {
                binding: shortcutKey
            } as any,
            async () => {
                await handleKeyboardShortcut()
            }
        )
    } catch (error) {
        console.warn("Could not register keyboard shortcut:", error)
    }
}

const mutationCallback = () => {
    observer.disconnect()
    processPageReferences()
    setTimeout(() => observeMainContent(), 500)
}

const observer = new MutationObserver(mutationCallback)

let isProcessingQuery: boolean = false
const processPageReferences = () => {
    if (isProcessingQuery) return
    isProcessingQuery = true
    setTimeout(() => {
        setTimeout(() => isProcessingQuery = false, 200)
        parent.document.body.querySelectorAll(
            ':is(#main-content-container,#right-sidebar) a.external-link:not([data-button-added="true"])[target="_blank"]:is([href^="http://"],[href^="https://"])'
        ).forEach(
            (element) => handleFoundLink(element as HTMLAnchorElement)
        )
    }, 100)
}

const handleFoundLink = (element: HTMLAnchorElement) => {
    if (element.dataset.buttonAdded === "true") return

    const url = element.href
    if (element.textContent === url) {
        const button = createConvertButton(url)
        element.after(button)
    }
    element.dataset.buttonAdded = "true"
}

const createConvertButton = (url: string): HTMLButtonElement => {
    const button = document.createElement('button')
    button.textContent = logseq.settings!.icon as string || "🛜"
    button.classList.add("external-link-submit-button")
    button.title = t("Get the title from the site and convert the URL string in the block to markdown")
    button.onclick = () => handleButtonClick(button, url)
    return button
}

const msgNotFoundBlock = "ERROR: The block could not be found.\nURL: "

const handleButtonClick = async (buttonElement: HTMLButtonElement, url: string) => {
    const blockElement = parent.document.body.querySelector(`:is(#main-content-container,#right-sidebar) div.block-content[data-type="default"][blockid][id]:has(a.external-link[href="${url}"])`) as HTMLElement | null
    if (blockElement) {
        const blockUuid = blockElement.id.replace("block-content-", "")
        if (blockUuid) {
            if (await convertUrlInBlock(url, blockUuid))
                buttonElement.style.display = "none"
            return
        }
    }
    alert(msgNotFoundBlock + url)
}

const handleKeyboardShortcut = async () => {
    try {
        const currentBlock = await logseq.Editor.getCurrentBlock()
        if (!currentBlock) {
            logseq.UI.showMsg(t("No block selected"), "warning", { timeout: 2000 })
            return
        }

        // Try to find URL in the current block content
        const urlInBlock = findUrlInBlockContent(currentBlock.content)
        if (!urlInBlock) {
            logseq.UI.showMsg(t("No URL found at cursor position"), "warning", { timeout: 2000 })
            return
        }

        // Convert the URL using existing logic
        if (await convertUrlInBlock(urlInBlock, currentBlock.uuid)) {
            logseq.UI.showMsg(t("URL converted to hyperlink"), "success", { timeout: 2000 })
        }
    } catch (error) {
        console.error("Error in keyboard shortcut handler:", error)
        logseq.UI.showMsg(t("Error converting URL"), "error", { timeout: 2000 })
    }
}

const findUrlInBlockContent = (content: string): string | null => {
    // URL regex pattern - matches http(s) URLs that are not already in markdown format
    const urlRegex = /(?<!\[.*?)https?:\/\/[^\s\[\]]+(?!\]\([^\)]*\))/g
    const match = content.match(urlRegex)
    
    if (match && match.length > 0) {
        // Return the first URL found that hasn't been converted yet
        return match[0]
    }
    
    return null
}

const findUrlAtCursor = (): string | null => {
    try {
        const selection = parent.getSelection()
        if (!selection || selection.rangeCount === 0) return null

        const range = selection.getRangeAt(0)
        const textNode = range.startContainer

        if (textNode.nodeType !== Node.TEXT_NODE) return null

        const text = textNode.textContent || ""
        const cursorPosition = range.startOffset

        // URL regex pattern - matches http(s) URLs
        const urlRegex = /https?:\/\/[^\s]+/g
        let match

        while ((match = urlRegex.exec(text)) !== null) {
            const urlStart = match.index
            const urlEnd = match.index + match[0].length

            // Check if cursor is within this URL
            if (cursorPosition >= urlStart && cursorPosition <= urlEnd) {
                return match[0]
            }
        }

        return null
    } catch (error) {
        console.error("Error finding URL at cursor:", error)
        return null
    }
}

const convertUrlInBlock = async (targetUrl: string, blockUuid: BlockEntity["uuid"]): Promise<boolean> => {
    const content = logseqMdModel === true ?
        await getContentFromUuid(blockUuid) as BlockEntity["content"] | null
        : await getContentFromUuidForDb(blockUuid) as BlockEntity["content"] | null
    if (content) {
        let [title, url] = await getTitleFromURL(targetUrl)
        if (title === "") {
            logseq.UI.showMsg(`${t("Title could not be retrieved from the site.")}\n${t("If the site is strict about fetch, nothing can be retrieved.")}` + `\n\nURL: ${url}`, "info", { timeout: 3000 })
            if (logseq.settings!.booleanInsertIfNotFoundTitle)
                title = t("Title")
            else
                return false
        }
        const replacedTitle = sanitizeTitle(title)
        const blockContent = content
            .replace(`[${targetUrl}](${targetUrl})`, `${url.endsWith(".pdf") ? "!" : ""}[${replacedTitle}](${url})`)
            .replace(targetUrl, `${url.endsWith(".pdf") ? "!" : ""}[${replacedTitle}](${url})`)
        if (content !== blockContent)
            await logseq.Editor.updateBlock(blockUuid, blockContent)
        return true
    } else {
        alert(msgNotFoundBlock + targetUrl)
        return false
    }
}

const sanitizeTitle = (title: string): string => {
    return title
        .replace("[", "")
        .replace("]", "")
        .replace(/[\n()\[\]]|{{|}}|#\+/g, (match) => {
            switch (match) {
                case "{{":
                    return "{"
                case "}}":
                    return "}"
                case "#+":
                    return " "
                default:
                    return ""
            }
        })
}

const observeMainContent = () => {
    const mainContentContainer = parent.document.getElementById("main-content-container") as HTMLDivElement
    const rightSidebar = parent.document.getElementById("right-sidebar") as HTMLDivElement

    if (mainContentContainer) {
        observer.observe(mainContentContainer, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        })
    }

    if (rightSidebar) {
        observer.observe(rightSidebar, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        })
    }
}

const resetAll = () => {
    parent.document.body.querySelectorAll(
        ':is(#main-content-container,#right-sidebar) button.external-link-submit-button'
    ).forEach((element) =>
        (element as HTMLElement).style.display = "none"
    )
}

logseq.ready(main).catch(console.error)