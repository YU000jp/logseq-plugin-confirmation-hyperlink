import { t } from "logseq-l10n"
import { convertOnlinePDF } from "./convertPDF"

export const getTitleFromURL = async (url: string): Promise<Array<string>> => {
    try {
        // PDFの場合はダウンロードする
        if (url.endsWith(".pdf")) {
            console.log("PDF file detected")
            return [t("title"), logseq.settings!.onlinePDF as boolean === true ? await convertOnlinePDF(url) as string : url] // オンラインからPDFをダウンロードするかどうか
        }
        console.log("fetch: ", url)
        const response = await fetch(url)
        // Skip Forbidden, Unauthorized
        if (response.status === 403 || response.status === 401) {
            return ["", url]
        }
        if (response == null) return ["", url]

        const contentType = response.headers.get('Content-Type')
        let charset = contentType !== null && contentType.toLowerCase().includes('charset=')
            ? contentType.split('charset=')[1].split(';')[0].trim()
            : 'utf-8'

        const buffer = await response.arrayBuffer()
        let html: string
        try {
            html = new TextDecoder(charset).decode(new Uint8Array(buffer))
        } catch (e) {
            // charsetが不正な場合はUTF-8で再試行
            html = new TextDecoder("utf-8").decode(new Uint8Array(buffer))
            charset = "utf-8"
        }

        let parser = new DOMParser()
        let doc = parser.parseFromString(html, 'text/html')

        // metaタグでcharsetが指定されていれば再デコード
        if (charset === "utf-8") {
            const metaCharset = doc.querySelector('meta[charset]')?.getAttribute('charset')
                || doc.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content')?.split('charset=')[1]?.split(';')[0]?.trim()
            if (metaCharset && metaCharset.toLowerCase() !== "utf-8") {
                try {
                    html = new TextDecoder(metaCharset).decode(new Uint8Array(buffer))
                    doc = parser.parseFromString(html, 'text/html')
                } catch (e) {
                    // サポート外の場合は無視
                }
            }
        }

        // タイトル取得の優先順位
        let title = doc.querySelector('title')?.innerText
        if (!title || title.trim() === "") {
            // og:title
            const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
            if (ogTitle && ogTitle.trim() !== "") {
                title = ogTitle
            } else {
                // twitter:title
                const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
                if (twitterTitle && twitterTitle.trim() !== "") {
                    title = twitterTitle
                } else {
                    // h1
                    const h1 = doc.querySelector('h1')?.innerText
                    if (h1 && h1.trim() !== "") {
                        title = h1
                    } else {
                        title = ""
                    }
                }
            }
        }
        if (title && title.trim() !== "") {
            return [title.trim(), url]
        }
    } catch (error) {
        console.error(error)
    }
    return ["", url]
}
