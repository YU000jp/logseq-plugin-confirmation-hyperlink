import { DEFAULT_REGEX, getFormatSettings, isAlreadyFormatted, isImage, isPDF, isWrappedIn } from './URL'
import { getRectFromUUID } from './lib'
import { showDialogForPDF } from './dialogForPDF'
import { key, setURL, showDialog } from '.'


export const parseBlockForLink = async (uuid: string, content: string, format: string) => {

    if (!uuid
        || !content)
        return

    const urls = content.match(DEFAULT_REGEX.line) as RegExpMatchArray | null
    if (!urls)
        return

    // if (parent.document.getElementById(`${logseq.baseInfo.id}--${key}`) as HTMLDivElement | null === null)
    //     setURL("")

    const formatSettings = await getFormatSettings(format) as { formatBeginning: string; applyFormat: (title: any, url: any) => string }

    if (!formatSettings)
        return

    let offset = 0
    for (const url of urls) {
        const urlIndex = content.indexOf(url, offset) as number
        if (isAlreadyFormatted(content, urlIndex, formatSettings.formatBeginning)
            || isImage(url)
            || isWrappedIn(content, url))
            continue

        // if (setURL("") === url)
        //     return

        setURL(url)

        let { left, right, top } = getRectFromUUID(uuid)

        if (logseq.settings!.onlinePDF === true
            && isPDF(url)) // PDFの場合
            showDialogForPDF(url, uuid, left, right, top)
        else // それ以外の場合
            showDialog(url, uuid, left, top, content, formatSettings)

    }
    setURL("")
}
