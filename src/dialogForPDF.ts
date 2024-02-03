import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n

import { convertOnlinePDF } from './convertPDF'
import { key, setURL } from '.'

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
        if (button)
            button.addEventListener("click", async () => {
                if (processing) return
                processing = true
                const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value
                if (!inputTitle) return
                const block = await logseq.Editor.getBlock(uuid) as { uuid: BlockEntity["uuid"] } | null
                if (block)
                    await convertOnlinePDF(url, uuid, inputTitle)

                else
                    logseq.UI.showMsg(t("Error: Block not found"), "warning")

                //実行されたらポップアップを削除
                const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null
                if (element) element.remove()
                processing = false
                setURL("")
            })
    }, 100)
}
