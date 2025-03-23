import { IAsyncStorage } from '@logseq/libs/dist/modules/LSPlugin.Storage'
import { t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { timestamp } from './lib'

const showMessage = (message: string, type: "error" | "success" | "warning", timeout: number) => {
    logseq.UI.showMsg(message, type, { timeout })
}

const saveFileToAssets = async (url: string, res: any, storage: IAsyncStorage): Promise<string> => {
    const name = url.split("/").pop() as string
    const find = await storage.hasItem(name)
    const rename = find ? `${timestamp()}_${name}` : name

    await storage.setItem(rename, await res.arrayBuffer())

    showMessage(
        find ? `${t("A file with the same name was found in the asset.")} "${rename}" ` : `${t("The file was saved into assets.")} "${name}" `,
        find ? "warning" : "success",
        find ? 2000 : 1200
    )

    return `../assets/storages/${logseq.baseInfo.id}/${rename}`
}

export const convertOnlinePDF = async (url: string): Promise<string> => {
    try {
        const res = await fetch(new URL(url))
        if (res.status !== 200) {
            showMessage("Error: " + res.status, "error", 1200)
            return url
        }
        const storage = logseq.Assets.makeSandboxStorage() as IAsyncStorage
        return await saveFileToAssets(url, res, storage)
    } catch (error) {
        showMessage(error as string, "error", 1200)
        return url
    }
}