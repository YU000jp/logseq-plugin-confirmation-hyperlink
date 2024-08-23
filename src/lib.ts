import { AppGraphInfo } from '@logseq/libs/dist/LSPlugin.user'


export const timestamp = () =>
    new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[-:]/g, "")
        .replace("T", "_")


export const includeTitle = (title: string): string => {
    return title
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


export const checkDemoGraph = async (): Promise<boolean> =>
    (await logseq.App.getCurrentGraph() as AppGraphInfo | null === null) ?
        true
        : false //デモグラフの場合は返り値がnull


export const getRectFromUUID = (uuid: string): { left: string; right: string; top: string } => {
    let top = ""
    let left = ""
    let right = ""
    const blockElement = parent.document.getElementsByClassName(uuid)[0] as HTMLElement
    //エレメントから位置を取得する
    const rect = (blockElement) ?
        blockElement.getBoundingClientRect() as DOMRect | undefined
        : null

    if (blockElement
        && rect) {
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
    return { left, right, top }
}

