import '@logseq/libs'; //https://plugins-doc.logseq.com/
import { AppUserConfigs, BlockEntity, LSPluginBaseInfo, SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';
import { IAsyncStorage } from '@logseq/libs/dist/modules/LSPlugin.Storage';
//import { setup as l10nSetup, t } from "logseq-l10n"; //https://github.com/sethyuan/logseq-l10n
//import ja from "./translations/ja.json";
const key = "confirmHyperlink";


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

    //CSS text-overflow
    //https://developer.mozilla.org/ja/docs/Web/CSS/text-overflow
    logseq.provideStyle(`
        div#hyperlink p {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
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
        div#hyperlink button#hyperlinkButton {
            font-size: 1.8em;
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


    logseq.Editor.registerBlockContextMenuItem("Create Hyperlink", async ({ uuid }) => {
        if (processing === true) return;
        const block = await logseq.Editor.getBlock(uuid) as BlockEntity | null;
        if (block) {
            processing = true; // ロックをかける
            await parseBlockForLink(block);
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



async function getTitleFromURL(url: string): Promise<string> {
    try {
        const res = await fetch(url) as Response;
        if (!res.ok) return '';
        const buffer = await res.arrayBuffer() as ArrayBuffer;
        const encoding = getEncodingFromHTML(buffer);
        const decodedHtml = new TextDecoder(encoding).decode(buffer);//文字化け対策
        let matches = decodedHtml.match(DEFAULT_REGEX.htmlTitleTag);
        if (matches !== null && matches.length > 1 && matches[2] !== null) return matches[2].trim();
    } catch (e) {
        console.error(e);
    }

    return '';
}

function getEncodingFromHTML(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    const dom = new DOMParser().parseFromString(new TextDecoder().decode(uint8Array), 'text/html');
    return (
        dom.querySelector('meta[charset]')?.getAttribute?.('charset') ??
        (dom.querySelector('meta[http-equiv="content-type"]') as HTMLMetaElement)?.content?.match?.(/charset=([^;]+)/)?.[1] ??
        'UTF-8'
    );
}


function convertUrlToMarkdownLink(title: string, url, text, applyFormat) {
    if (!title) return;
    return text.replace(url, applyFormat(includeTitle(title), url));
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
    const uuid = rawBlock?.uuid;
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
        let top = "";
        let left = "";
        let right = "";
        //エレメントから位置を取得する
        const rect = (blockElement[0]) ? blockElement[0]!.getBoundingClientRect() as DOMRect | undefined : null;

        if (blockElement && rect) {
            const offsetTop = Number(rect.top - 142);
            top = (offsetTop > 0) ?
                Number(offsetTop) + "px"
                : Number(rect.top + 40) + "px";

            left = String(Number(rect.left - 10)) + "px";
            const offsetRight = Number(rect.right - 350);
            right = (offsetRight > 0) ?
                String(rect.right) + "px"
                : "1em";
            right = "";
        } else {
            top = "2em";
            right = "1em";
        }

        if (isPDF(url)) {
            showDialogForPDF(url, uuid, left, right, top);
        } else {
            showDialog(url, uuid, left, top, text, formatSettings);
        }
        continue;
    }
}

function showDialog(url: string, uuid: string, left: string, top: string, text: string, formatSettings: { formatBeginning: string; applyFormat: (title: any, url: any) => string; }) {
        if(!uuid) return;
    logseq.provideUI({
        attrs: {
            title: 'Convert to markdown hyperlink',
        },
        key,
        replace: true,
        reset: true,
        template: `
                    <div id="hyperlink">
                    <p>Title: <input id="hyperlinkTitle" type="text" style="width:450px" disabled="true"/>
                    <button id="hyperlinkButtonGetTitle" title="Get the title">Get</button>
                    <button id="hyperlinkButton" title="Submit">☑️</button></p>
                    <p>URL: (<a href="${url}" target="_blank" title="URL">${url}</a>)</p>
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
            width: "580px",
            height: "125px",
            left,
            right: "unset",
            bottom: "unset",
            top,
            paddingLeft: "0.4em",
            backgroundColor: 'var(--ls-primary-background-color)',
            color: 'var(--ls-primary-text-color)',
            boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
        },
    });
    setTimeout(() => {
        let processing: Boolean = false;

        //タイトル取得ボタン
        const divElement = parent.document.getElementById("hyperlink") as HTMLDivElement;
        if (divElement) {
            divElement.addEventListener("mouseover", async () => {
                if (processing) return;
                processing = true;
                const title = await getTitleFromURL(url);
                const elementTitle = parent.document.getElementById("hyperlinkTitle") as HTMLInputElement;
                if (title && elementTitle) elementTitle.value = includeTitle(title);
                elementTitle.disabled = false;
                //タイトルボタンを消す
                const elementButtonGetTitle = parent.document.getElementById("hyperlinkButtonGetTitle") as HTMLButtonElement | null;
                if (elementButtonGetTitle) elementButtonGetTitle.remove();
                //実行ボタンを表示
                const button = parent.document.getElementById("hyperlinkButton") as HTMLButtonElement | null;
                if (button) button.style.display = "inline";
                processing = false;
            }, { once: true });
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

function showDialogForPDF(url: string, uuid: string, left: string, right: string, top: string) {
    if(uuid) return;
    logseq.provideUI({
        attrs: {
            title: 'Edit the title of online pdf',
        },
        key,
        reset: true,
        replace: true,
        template: `
                    <div id="hyperlink">
                    <p>Title: <input id="hyperlinkTitle" type="text" style="width:450px" value="${url.split("/").pop() as string}"/>
                    <button id="hyperlinkButton" title="Submit">☑️</button></p>
                    <p>URL: (<a href="${url}" target="_blank" title="URL">${url}</a>)</p>
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
            width: "580px",
            height: "125px",
            left: (left !== "") ? left : "unset",
            right: (right !== "") ? right : "unset",
            bottom: "unset",
            top,
            paddingLeft: "0.4em",
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
                    await convertOnlinePDF(url, uuid, inputTitle);
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

async function convertOnlinePDF(url: string, uuid: string, inputTitle: string) {
    await fetch(new URL(url))
        .then(async (res: any) => {
            if (res.status !== 200) {
                //読み込みできなかった場合
                logseq.UI.showMsg("Error: " + res.status, "error", { timeout: 1200 });
                return;
            }
            //アセットに保存する
            const storage = logseq.Assets.makeSandboxStorage() as IAsyncStorage;
            //ファイル重複チェックを入れる(timestampをつける)
            const name = url.split("/").pop() as string;
            let rename: string;
            const find: Boolean = await storage.hasItem(name) as boolean;
            if (find === true) {
                rename = `${timestamp()}_` + name;
            } else {
                rename = name;
            }
            await storage.setItem(rename, await res.arrayBuffer() as string);
            if (find === true) {
                //重複しているためtimestampをつけたことを伝える
                logseq.UI.showMsg(`The file is find from assets. The name has been changed to \`${rename}\``, "warning", { timeout: 2000 });
            } else {
                //ファイルの作成完了を伝える
                logseq.UI.showMsg(`The file is saved into assets. \`${name}\``, "success", { timeout: 1200 });
            }
            //ブロックの更新
            const block = await logseq.Editor.getBlock(uuid) as BlockEntity;
            if (block) await logseq.Editor.updateBlock(uuid, block.content.replace(url, `![${inputTitle}](../assets/storages/${logseq.baseInfo.id}/${rename})`));
        })
        .catch(error => {
            //読み込みできなかった場合
            logseq.UI.showMsg(error, "error", { timeout: 1200 });
        });
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

const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");


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
        title: "Use hyperlink icon 🔗",
        description: "",
        default: false,
    },
];


logseq.ready(main).catch(console.error);
