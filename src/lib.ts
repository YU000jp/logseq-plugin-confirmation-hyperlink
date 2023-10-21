import { AppGraphInfo } from '@logseq/libs/dist/LSPlugin.user'

export const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_")
export const includeTitle = (title: string): string => {
    return title.replace(/[\n()\[\]]|{{|}}|#\+/g, (match) => {
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
export const checkDemoGraph = async (): Promise<boolean> => (await logseq.App.getCurrentGraph() as AppGraphInfo | null === null) ? true : false //デモグラフの場合は返り値がnull

