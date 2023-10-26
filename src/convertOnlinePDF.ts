import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { IAsyncStorage } from '@logseq/libs/dist/modules/LSPlugin.Storage'
import { t } from "logseq-l10n"; //https://github.com/sethyuan/logseq-l10n
import { timestamp } from './lib'

export const convertOnlinePDF = async (url: string, uuid: string, inputTitle: string) => {
    await fetch(new URL(url))
        .then(async (res: any) => {
            if (res.status !== 200) {
                //読み込みできなかった場合
                logseq.UI.showMsg("Error: " + res.status, "error", { timeout: 1200 })
                return
            }
            //アセットに保存する
            const storage = logseq.Assets.makeSandboxStorage() as IAsyncStorage
            //ファイル重複チェックを入れる(timestampをつける)
            const name = url.split("/").pop() as string
            let rename: string
            const find: Boolean = await storage.hasItem(name) as boolean
            if (find === true) {
                rename = `${timestamp()}_` + name
            } else {
                rename = name
            }
            await storage.setItem(rename, await res.arrayBuffer() as string)
            if (find === true) {
                //重複しているためtimestampをつけたことを伝える
                logseq.UI.showMsg(`${t("A file with the same name was found in the asset.")} "${rename}" `, "warning", { timeout: 2000 })
            } else {
                //ファイルの作成完了を伝える
                logseq.UI.showMsg(`${t("The file was saved into assets.")} "${name}" `, "success", { timeout: 1200 })
            }
            //ブロックの更新
            const block = await logseq.Editor.getBlock(uuid) as BlockEntity
            if (block) await logseq.Editor.updateBlock(uuid, block.content.replace(url, `![${inputTitle}](../assets/storages/${logseq.baseInfo.id}/${rename})`))
        })
        .catch(error => {
            //読み込みできなかった場合
            logseq.UI.showMsg(error, "error", { timeout: 1200 })
        })
}
