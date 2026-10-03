import { AppInfo } from "@logseq/libs/dist/LSPlugin"
import { replaceLogseqMdModel, replaceLogseqVersion } from "."

// アプリ世代判定(バージョン解析・情報用のみ。グラフ種別の判定には使わない)
const fetchAppInfo = async (): Promise<{ version: string; isDbEra: boolean }> => {
    const info = (await logseq.App.getInfo()) as AppInfo | null
    const version = typeof info?.version === "string" ? info.version : "0.0.0"
    const m = version.match(/(\d+)\.(\d+)\.(\d+)/)
    // DB系アプリ世代(新UI)は 2.x または移行期の 0.11.x。supportDb は常に true で信用できない
    const isDbEra = m ? Number(m[1]) >= 2 || (Number(m[1]) === 0 && Number(m[2]) >= 11) : false
    return { version: m ? m[0] : version, isDbEra }
}

// グラフ種別判定(公式API。0.10.x ホストでは未実装 → false)
const checkLogseqDbGraph = async (): Promise<boolean> => {
    try {
        const value = await (logseq.App as any).checkCurrentIsDbGraph()
        return typeof value === "boolean" ? value : false
    } catch {
        return false // API非搭載ホスト = DBグラフを開けない旧アプリ
    }
}

/**
 * Checks the app info and the current graph type, and updates the flags.
 * logseqMdModel means "the current graph is file-based" (= !isDbGraph), not derived from the app version.
 * DB系アプリ(0.11+/2.x)上のファイルグラフや OG 1.x でも true になる。
 */
export const logseqModelCheck = async (): Promise<void> => {
    const { version } = await fetchAppInfo()
    replaceLogseqVersion(version)
    const isDbGraph = await checkLogseqDbGraph()
    replaceLogseqMdModel(!isDbGraph)
}
