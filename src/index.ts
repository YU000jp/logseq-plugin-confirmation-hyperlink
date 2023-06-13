import '@logseq/libs'; //https://plugins-doc.logseq.com/
import { AppUserConfigs, BlockEntity, LSPluginBaseInfo, SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';
//import { setup as l10nSetup, t } from "logseq-l10n"; //https://github.com/sethyuan/logseq-l10n
//import ja from "./translations/ja.json";
import Encoding from 'encoding-japanese';//https://github.com/polygonplanet/encoding.js

//Credit
//https://github.com/0x7b1/logseq-plugin-automatic-url-title

const DEFAULT_REGEX = {
    wrappedInApostrophe: /(`+)(.*?)\1(?=[^`]*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,}))[^\`]*?\1/gis,
    wrappedInHTML: /@@html:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*@@/gis,
    wrappedInCommand: /(\{\{([a-zA-Z]+)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*\}\})/gis,
    wrappedInHiccup: /\[:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*\]/gis,
    htmlTitleTag: /<title(\s[^>]+)*>([^<]*)<\/title>/,
    line: /(https?:\/\/(?:www\.|\b)(\w[\w-]+\w\.[^\s　]{2,}|www\.\w[\w-]+\w\.[^\s　]{2,}|\w+\.[^\s　]{2,}|www\.\w+\.[^\s　]{2,}))(?!\))/gi,
    imageExtension: /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i,
    pdfExtension: /\.(pdf)$/i,
};

const FORMAT_SETTINGS = {
    markdown: {
        formatBeginning: '](',
        applyFormat: (title, url) => `[${title}](${url})`,
    },
    org: {
        formatBeginning: '][',
        applyFormat: (title, url) => `[[${url}][${title}]]`,
    },

};

const decodeHTML = (input) => (new DOMParser().parseFromString(input, 'text/html')).documentElement.textContent;

async function getTitle(url) {
    try {
        //title convert UTF-8
        let matches = (await (await fetch(url)).text()).match(DEFAULT_REGEX.htmlTitleTag);
        if (matches && /[^\p{ASCII}]/u.test(matches[0])) {
            matches = await Encoding.convert(matches, 'UTF8', 'AUTO');//エンコード処理(文字化け対策)
        }
        if (matches !== null && matches.length > 1 && matches[2] !== null) return decodeHTML(matches[2].trim());
    } catch (e) {
        console.error(e);
    }

    return '';
}

function convertUrlToMarkdownLink(title: string, url, text, applyFormat, isPDF?: boolean) {
    if (!title) return;
    title = includeTitle(title);
    let wrappedUrl;
    if (isPDF === true) {
        let urlPDF = url;
        if (logseq.settings!.OnlinePDFtimestamp === true) urlPDF += "#" + new Date().getTime();
        wrappedUrl = "!" + applyFormat(title, urlPDF);
    } else {
        wrappedUrl = applyFormat(title, url);
    }
    return text.replace(url, wrappedUrl);
}
const isImage = (url: string) => (new RegExp(DEFAULT_REGEX.imageExtension)).test(url);
const isPDF = (url: string) => (new RegExp(DEFAULT_REGEX.pdfExtension)).test(url);
const isAlreadyFormatted = (text: string, urlIndex: number, formatBeginning: string) => text.slice(urlIndex - 2, urlIndex) === formatBeginning;

function isWrappedIn(text, url) {
    // "@@html: "URLを含む何らかの文字"@@"にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/1
    // `URLを含む何らかの文字`にマッチする ``も対応
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/3
    // [: "URL"]のような形式にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/8
    const wrappedLinks = text.match(DEFAULT_REGEX.wrappedInCommand) || text.match(DEFAULT_REGEX.wrappedInHTML) || text.match(DEFAULT_REGEX.wrappedInApostrophe) || text.match(DEFAULT_REGEX.wrappedInHiccup);
    if (!wrappedLinks) return false;
    return wrappedLinks.some(command => command.includes(url));
}


async function getFormatSettings() {
    const { preferredFormat } = await logseq.App.getUserConfigs() as AppUserConfigs;
    if (!preferredFormat) return null;

    return FORMAT_SETTINGS[preferredFormat];
}

const parseBlockForLink = async (rawBlock: BlockEntity) => {
    if (!rawBlock) return;
    const uuid = rawBlock!.uuid;
    if (!uuid) return;
    let text = rawBlock.content;
    const urls = text.match(DEFAULT_REGEX.line);
    if (!urls) return;

    const formatSettings = await getFormatSettings();
    if (!formatSettings) return;
    let offset = 0;
    for (const url of urls) {
        const urlIndex = text.indexOf(url, offset);
        if (isAlreadyFormatted(text, urlIndex, formatSettings.formatBeginning) || isImage(url) || isWrappedIn(text, url)) continue;

        const blockElement = parent.document.getElementsByClassName(uuid) as HTMLCollectionOf<HTMLElement>;
        if (!blockElement) return;

        //エレメントから位置を取得する
        const rect = blockElement[0].getBoundingClientRect();
        if (!rect) return;
        const top: string = Number(rect.top + window.pageYOffset - 142) + "px";
        const left: string = Number(rect.left + window.pageXOffset + 80) + "px";
        const key = "confirmation-hyperlink";

        if (isPDF(url)) {

            logseq.provideUI({
                attrs: {
                    title: 'Edit the title of online pdf',
                },
                key,
                reset: true,
                replace: true,
                template: `
                    <div id="hyperlink">
                    <p>Title: <input id="hyperlinkTitle" type="text" style="width:450px"/>
                    <button id="hyperlinkButton">Submit</button></p>
                    <p>URL: (<a href="${url}" target="_blank">${url}</a>)</p>
                    </div>
                    <style>
                    div.light-theme span#dot-${uuid}{
                        outline: 2px solid var(--ls-link-ref-text-color);
                    }
                    div.dark-theme span#dot-${uuid}{
                        outline: 2px solid aliceblue;
                    }
                    </style>
                    `,
                style: {
                    width: "650px",
                    height: "140px",
                    left,
                    top,
                    paddingLeft: "1.8em",
                    backgroundColor: 'var(--ls-primary-background-color)',
                    color: 'var(--ls-primary-text-color)',
                    boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
                },
            });
            setTimeout(() => {
                let processing: Boolean = false;
                const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement;
                if (button) {
                    button.addEventListener("click", async () => {
                        if (processing) return;
                        processing = true;
                        const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value;
                        if (!inputTitle) return;
                        const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null;
                        if (block) {
                            const updatedTitle = convertUrlToMarkdownLink(inputTitle, url, text, formatSettings.applyFormat, true);
                            if (updatedTitle) logseq.Editor.updateBlock(uuid, text);
                        } else {
                            logseq.UI.showMsg("Error: Block not found", "warning");
                        }
                        //実行されたらポップアップを削除
                        const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null;
                        if (element) element.remove();
                        processing = false;
                    });
                }
            }, 100);

        } else {

            logseq.provideUI({
                attrs: {
                    title: 'Convert to markdown hyperlink',
                },
                key,
                replace: true,
                reset: true,
                template: `
                    <div id="hyperlink">
                    <p>Title: <input id="hyperlinkTitle" type="text" style="width:450px"/>
                    <button id="hyperlinkButtonGetTitle">Get the title</button>
                    <button id="hyperlinkButton">Submit</button></p>
                    <p>URL: (<a href="${url}" target="_blank">${url}</a>)</p>
                    </div>
                    <style>
                    div.light-theme span#dot-${uuid}{
                        outline: 2px solid var(--ls-link-ref-text-color);
                    }
                    div.dark-theme span#dot-${uuid}{
                        outline: 2px solid aliceblue;
                    }
                    div#hyperlink button#hyperlinkButton {
                        display: none;
                    }
                    </style>
                    `,
                style: {
                    width: "650px",
                    height: "140px",
                    left,
                    top,
                    paddingLeft: "1.8em",
                    backgroundColor: 'var(--ls-primary-background-color)',
                    color: 'var(--ls-primary-text-color)',
                    boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
                },
            });
            setTimeout(() => {
                let processing: Boolean = false;

                //タイトル取得ボタン
                const buttonGetTitle = parent.document.getElementById("hyperlinkButtonGetTitle") as HTMLButtonElement;
                if (buttonGetTitle) {
                    buttonGetTitle.addEventListener("click", async () => {
                        if (processing) return;
                        processing = true;
                        const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement);
                        if (!inputTitle) return;
                        const title = await getTitle(url);
                        if (title) {
                            (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value = includeTitle(title);
                        }
                        //タイトルボタンを消す
                        const element = parent.document.getElementById("hyperlinkButtonGetTitle") as HTMLButtonElement | null;
                        if (element) element.remove();
                        //実行ボタンを表示
                        const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement | null;
                        if (button) button.style.display = "inline";
                        processing = false;
                    });
                }

                //実行ボタン
                const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement;
                if (button) {
                    button.addEventListener("click", async () => {
                        if (processing) return;
                        processing = true;
                        const inputTitle = (parent.document.getElementById("hyperlinkTitle") as HTMLInputElement).value;
                        if (!inputTitle) return;
                        const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null;
                        if (block) {
                            const updatedTitle = convertUrlToMarkdownLink(inputTitle, url, text, formatSettings.applyFormat);
                            if (updatedTitle) logseq.Editor.updateBlock(uuid, updatedTitle);
                        } else {
                            logseq.UI.showMsg("Error: Block not found", "warning");
                        }
                        //実行されたらポップアップを削除
                        const element = parent.document.getElementById(logseq.baseInfo.id + `--${key}`) as HTMLDivElement | null;
                        if (element) element.remove();
                        processing = false;
                    });
                }
            }, 100);
        }
        continue;
    }
}

function includeTitle(title: string): string {
    return title.replace(/[\n()\[\]]|{{|}}|#\+/g, (match) => {
        switch (match) {
            case "{{":
                return "{";
            case "}}":
                return "}";
            case "#+":
                return " ";
            default:
                return "";
        }
    });
}


/* main */
const main = () => {
    //     (async () => {
    //         try {
    //             await l10nSetup({ builtinTranslations: { ja } });
    //         } finally {
    /* user settings */
    logseq.useSettingsSchema(settingsTemplate);
    //             if (!logseq.settings) {
    //                 setTimeout(() => {
    //                     logseq.showSettingsUI();
    //                 }
    //                     , 300);
    //             }
    //         }
    //     })();


    logseq.provideStyle(`
        div#hyperlink p {
            white-space: nowrap;
            overflow-x: auto;
        }
        div#hyperlink input {
            background: var(--ls-primary-background-color);
            color: var(--ls-primary-text-color);
            boxShadow: 1px 2px 5px var(--ls-secondary-background-color);
        }
        div#hyperlink button {
            border: 1px solid var(--ls-secondary-background-color);
            boxShadow: 1px 2px 5px var(--ls-secondary-background-color);
            text-decoration: underline;
        }
        div#hyperlink button:hover {
            background: var(--ls-secondary-background-color);
            color: var(--ls-secondary-text-color);
        }
        `);

    if (logseq.settings!.linkIcon === true) setLinkIcon();


    let processing: boolean = false; // ロック用フラグ
    logseq.DB.onChanged(async () => {
        if (processing === true) return; // 処理中の場合はリターンして重複を避ける
        const currentBlock = await logseq.Editor.getCurrentBlock() as BlockEntity | null;
        if (currentBlock) {
            processing = true; // ロックをかける
            await parseBlockForLink(currentBlock);
        }
        processing = false; // ロックを解除する
    });


    logseq.onSettingsChanged((newSet: LSPluginBaseInfo['settings'], oldSet: LSPluginBaseInfo['settings']) => {
        if (oldSet.linkIcon !== true && newSet.linkIcon === true) {
            setLinkIcon();
        } else if (oldSet.linkIcon !== false && newSet.linkIcon === false) {
            removeProvideStyle("linkIcon");
        }
    });

};/* end_main */


const removeProvideStyle = (className: string) => {
    const doc = parent.document.head.querySelector(`style[data-injected-style^="${className}"]`);
    if (doc) doc.remove();
};

const setLinkIcon = () => {
    logseq.provideStyle({
        key: "linkIcon", style: `
a.external-link::before {
content: "🔗";
color: #3dbae3;
}
`});
};

/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
const settingsTemplate: SettingSchemaDesc[] = [
    {
        key: "linkIcon",
        type: "boolean",
        title: "Hyperlink icon 🔗",
        description: "Turn ON/OFF",
        default: true,
    },
    {
        key: "OnlinePDFtimestamp",
        type: "boolean",
        title: "Add current timestamp to Online pdf URL (To handle cases where a PDF is updated with the same URL)",
        description: "Turn ON/OFF",
        default: true,
    }
];


logseq.ready(main).catch(console.error);
