import { t } from "logseq-l10n"
import { convertOnlinePDF } from "./convertPDF"

export const getTitleFromURL = async (url: string): Promise<Array<string>> => {
    try {
        if (url.startsWith("https://github.com/")) {
            const title = extractTitleFromGitHubURL(url)
            console.log("GitHub URL detected, title: ", title)
            return [title, url]
        } else
            // PDFの場合はダウンロードする
            if (url.endsWith(".pdf")) {
                console.log("PDF file detected")
                return [t("title"), logseq.settings!.onlinePDF as boolean === true ? await convertOnlinePDF(url) as string : url] // オンラインからPDFをダウンロードするかどうか
            }
        console.log("fetch: ", url)
        const response = await fetch(url)
        if (!response.ok) return ["", url]

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("text/html")) {
            console.log("Not an HTML response")
            return ["", url]
        }

        const { charset, title } = extractCharsetAndTitleFromHTML(await response.arrayBuffer())
        if (title) {
            console.log("Get title: ", title)
            return [title, url]
        }
    } catch (error) {
        console.error(error)
    }
    return ["", url]
}

const extractTitleFromGitHubURL = (url: string): string => {
    return url.substring("https://github.com/".length)
}

interface CharsetAndTitle {
    charset: string
    title: string | null
}

const decodeHtmlEntities = (text: string): string => {
    const tempElement = document.createElement('textarea')
    tempElement.innerHTML = text
    return tempElement.value
}

const extractCharsetAndTitleFromHTML = (buffer: ArrayBuffer): CharsetAndTitle => {
    const initialChunk = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 2048))
    let htmlString = new TextDecoder('utf-8').decode(initialChunk)

    let charsetMatch = htmlString.match(/<meta\s+charset=["']?([^"']+)["']?/i)
    let charset = charsetMatch ? charsetMatch[1] : null

    if (!charset) {
        const contentTypeMatch = htmlString.match(/<meta\s+http-equiv=["']content-type["'][^>]*content=["']?[^;]+;\s*charset=([^"']+)["']?/i)
        charset = contentTypeMatch ? contentTypeMatch[1] : 'UTF-8'
    }

    let title: string | null = null
    if (charset.toLowerCase() === 'utf-8') {
        const titleMatch = htmlString.match(/<title>(.*?)<\/title>/i)
        if (titleMatch)
            title = decodeHtmlEntities(titleMatch[1].trim())
    } else {
        const titleTagPosition = htmlString.indexOf('<title>')
        if (titleTagPosition !== -1) {
            const endPosition = Math.min(buffer.byteLength, titleTagPosition + 2048)
            const titleChunk = new Uint8Array(buffer.slice(titleTagPosition, endPosition))
            htmlString = new TextDecoder(charset).decode(titleChunk)
            const titleMatch = htmlString.match(/<title>(.*?)<\/title>/i)
            if (titleMatch)
                title = decodeHtmlEntities(titleMatch[1].trim())
        }
    }

    return {
        charset: charset ?? 'UTF-8',
        title
    }
}