import { includeTitle } from './lib'


//Credit
//https://github.com/0x7b1/logseq-plugin-automatic-url-title


export const DEFAULT_REGEX = {

    // `URLを含む何らかの文字`にマッチする ``も対応
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/3
    wrappedInApostrophe: /(`+)(.*?)\1(?=[^`]*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,}))[^\`]*?\1/gis,

    // "@@html: "URLを含む何らかの文字"@@"にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/1
    wrappedInHTML: /@@html:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*@@/gis,

    // コマンドの場合は{{"URL"}}のようになる
    wrappedInCommand: /(\{\{([a-zA-Z]+)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*\}\})/gis,

    // Hiccupの場合は[: "URL"]のようになる
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/8
    wrappedInHiccup: /\[:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*\]/gis,

    // URLを取得するための正規表現
    line: /(https?:\/\/(?:www\.|\b)(\w[\w-]+\w\.[^\s　]{2,}|www\.\w[\w-]+\w\.[^\s　]{2,}|\w+\.[^\s　]{2,}|www\.\w+\.[^\s　]{2,}))(?!\))/gi,

    // html以外の拡張子のファイルを検知するための拡張子を指定する
    imageExtension: /\.(gif|jpg|jpeg|tif|tiff|png|webp|bmp|ico|svg|eps|raw|mp4|avi|wmv|flv|mov|mkv|webm|mpg|mpeg|3gp|3g2)$/i,

    // PDFを検知するための拡張子を指定する
    pdfExtension: /\.(pdf)$/i,
}


export const isImage = (url: string) =>
    (new RegExp(DEFAULT_REGEX.imageExtension)).test(url)


export const isPDF = (url: string) =>
    (new RegExp(DEFAULT_REGEX.pdfExtension)).test(url)


export const isAlreadyFormatted =
    (text: string, urlIndex: number, formatBeginning: string) => text.slice(urlIndex - 2, urlIndex) === formatBeginning


export const isWrappedIn = (text, url) => {
    // チェックをおこなう
    const wrappedLinks = text.match(DEFAULT_REGEX.wrappedInCommand)
        || text.match(DEFAULT_REGEX.wrappedInHTML)
        || text.match(DEFAULT_REGEX.wrappedInApostrophe)
        || text.match(DEFAULT_REGEX.wrappedInHiccup)
    if (!wrappedLinks)
        return false
    return wrappedLinks.some(command => command.includes(url))
}


export const getFormatSettings = (format: string) => FORMAT_SETTINGS[format]


export const FORMAT_SETTINGS = {
    //ユーザーが設定したフォーマット
    // マークダウンの場合
    markdown: {
        formatBeginning: '](',
        applyFormat: (title, url) => `[${title}](${url})`,
    },
    // ORGの場合
    org: {
        formatBeginning: '][',
        applyFormat: (title, url) => `[[${url}][${title}]]`,
    },
}


export const getTitleFromURL = async (url: string): Promise<string> => {
    try {
        console.log("fetch: ", url)
        const res = await fetch(url) as Response
        if (!res.ok) return ''
        const { charset, title } = getEncodingConfigAndTitleFromHTML(await res.arrayBuffer() as ArrayBuffer)
        if (title) {
            console.log("Get title: ",title)
            return title
        }
    } catch (e) {
        console.error(e)
    }
    return ''
}


export const convertUrlToMarkdownLink = (title: string, url, text, applyFormat) => {
    if (!title) return
    return text.replace(url, applyFormat(includeTitle(title), url))
}


interface EncodingAndTitle {
    charset: string
    title: string | null
}

const decodeHtmlEntities = (text: string): string => {
    const tempElement = document.createElement('textarea')
    tempElement.innerHTML = text
    return tempElement.value
}

const getEncodingConfigAndTitleFromHTML = (buffer: ArrayBuffer): EncodingAndTitle => {
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