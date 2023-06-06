import '@logseq/libs'; //https://plugins-doc.logseq.com/
import { AppUserConfigs, BlockEntity, LSPluginBaseInfo, SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';
//import { setup as l10nSetup, t } from "logseq-l10n"; //https://github.com/sethyuan/logseq-l10n
//import ja from "./translations/ja.json";
import Swal from 'sweetalert2';//https://sweetalert2.github.io/
import Encoding from 'encoding-japanese';//https://github.com/polygonplanet/encoding.js
let background;
let color;

//Credit
//https://github.com/0x7b1/logseq-plugin-automatic-url-title

const DEFAULT_REGEX = {
    wrappedInApostrophe: /(`+)(.*?)\1(?=[^`]*?(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}))[^\`]*?\1/gis,
    wrappedInHTML: /@@html:\s*(.*?)\s*(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\s*(.*?)\s*@@/gis,
    wrappedInCommand: /(\{\{([a-zA-Z]+)\s*(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\s*\}\})/gis,
    wrappedInHiccup: /\[:\s*(.*?)\s*(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\s*(.*?)\s*\]/gis,
    htmlTitleTag: /<title(\s[^>]+)*>([^<]*)<\/title>/,
    line: /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
    imageExtension: /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i,
    pdfExtension: /\.(pdf)$/i,
};

const FORMAT_SETTINGS = {
    //ユーザー設定を反映させる(ページの設定ではない TODO:)
    markdown: {
        formatBeginning: '](',
        applyFormat: (title, url) => `[${title}](${url})`,
    },
    org: {
        formatBeginning: '][',
        applyFormat: (title, url) => `[[${url}][${title}]]`,
    },

};

function decodeHTML(input) {
    if (!input) {
        return '';
    }

    const doc = new DOMParser().parseFromString(input, 'text/html');
    return doc.documentElement.textContent;
}

async function getTitle(url) {
    try {
        //title convert UTF-8
        let matches = (await (await fetch(url)).text()).match(DEFAULT_REGEX.htmlTitleTag);
        if (matches && /[^\p{ASCII}]/u.test(matches[0])) {
            matches = await Encoding.convert(matches, 'UTF8', 'AUTO');//エンコード処理(文字化け対策)
        }
        if (matches !== null && matches.length > 1 && matches[2] !== null) {
            return decodeHTML(matches[2].trim());
        }
    } catch (e) {
        console.error(e);
    }

    return '';
}

function convertUrlToMarkdownLink(title: string, url, text, urlStartIndex, offset, applyFormat, isPDF?: boolean) {
    if (title) {
        title = includeTitle(title);
    } else {
        return { text, offset };
    }

    const startSection = text.slice(0, urlStartIndex);
    let wrappedUrl;
    if (isPDF === true) {
        wrappedUrl = "!" + applyFormat(title, url);
    } else {
        wrappedUrl = applyFormat(title, url);
    }
    const endSection = text.slice(urlStartIndex + url.length);

    return {
        text: `${startSection}${wrappedUrl}${endSection}`,
        offset: urlStartIndex + url.length,
    };
}

function isImage(url) {
    const imageRegex = new RegExp(DEFAULT_REGEX.imageExtension);
    return imageRegex.test(url);
}

function isPDF(url) {
    const pdfRegex = new RegExp(DEFAULT_REGEX.pdfExtension);
    return pdfRegex.test(url);
}

function isAlreadyFormatted(text, url, urlIndex, formatBeginning) {
    return text.slice(urlIndex - 2, urlIndex) === formatBeginning;
}

function isWrappedIn(text, url) {
    // "@@html: "URLを含む何らかの文字"@@"にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/1
    // `URLを含む何らかの文字`にマッチする ``も対応
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/3
    // [: "URL"]のような形式にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/8
    const wrappedLinks = text.match(DEFAULT_REGEX.wrappedInCommand) || text.match(DEFAULT_REGEX.wrappedInHTML) || text.match(DEFAULT_REGEX.wrappedInApostrophe) || text.match(DEFAULT_REGEX.wrappedInHiccup);
    if (!wrappedLinks) {
        return false;
    }
    return wrappedLinks.some(command => command.includes(url));
}


async function getFormatSettings() {
    const { preferredFormat } = await logseq.App.getUserConfigs() as AppUserConfigs;
    if (!preferredFormat) {
        return null;
    }

    return FORMAT_SETTINGS[preferredFormat];
}

const parseBlockForLink = async (uuid) => {
    if (!uuid) {
        return;
    }

    const rawBlock = await logseq.Editor.getBlock(uuid) as BlockEntity | null;
    if (!rawBlock) {
        return;
    }

    let text = rawBlock.content;
    const urls = text.match(DEFAULT_REGEX.line);
    if (!urls) {
        return;
    }

    const formatSettings = await getFormatSettings();
    if (!formatSettings) {
        return;
    }
    let Cancel: boolean = false;
    let offset = 0;
    for (const url of urls) {
        const urlIndex = text.indexOf(url, offset);
        if (isAlreadyFormatted(text, url, urlIndex, formatSettings.formatBeginning) || isImage(url) || isWrappedIn(text, url)) {
            continue;
        }
        if (isPDF(url)) {
            let urlPDF = url;
            if (logseq.settings!.OnlinePDFtimestamp === true) {
                urlPDF += "#" + new Date().getTime();
            }
            //dialog
            logseq.showMainUI();

            await Swal.fire({
                title: "Edit the title of online pdf",
                text: `(${urlPDF})`,
                input: "text",
                showCancelButton: false,
                color,
                background,
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                        if (value) {
                            resolve("");
                        } else {
                            resolve('Input cannot be empty!');
                        }
                    });
                },
            }).then((resultEditTitle) => {
                if (resultEditTitle?.value) {
                    const updatedTitle = convertUrlToMarkdownLink(resultEditTitle.value, urlPDF, text, urlIndex, offset, formatSettings.applyFormat, true);
                    text = updatedTitle.text;
                    offset = updatedTitle.offset;
                    logseq.Editor.updateBlock(uuid, text);
                }
            }).finally(() => {
                logseq.hideMainUI({ restoreEditingCursor: true });
            });
            //dialog end
        } else {
            //dialog
            logseq.showMainUI();
            await Swal.fire({
                title: "Convert to markdown hyperlink",
                text: `(${url})`,
                icon: "info",
                showCancelButton: true,
                color,
                background,
            })
                .then(async (result) => {
                    if (result) {//OK
                        if (result?.value) {
                            const inputValue: string = includeTitle(await getTitle(url) || "");
                            await Swal.fire({
                                title: "Edit the title of hyperlink",
                                input: "text",
                                inputValue,
                                showCancelButton: false,
                                color,
                                background,
                                inputValidator: (value) => {
                                    return new Promise((resolve) => {
                                        if (value) {
                                            resolve("");
                                        } else {
                                            resolve('Input cannot be empty!');
                                        }
                                    });
                                },
                            }).then((resultEditTitle) => {
                                if (resultEditTitle?.value) {
                                    const updatedTitle = convertUrlToMarkdownLink(resultEditTitle.value, url, text, urlIndex, offset, formatSettings.applyFormat)
                                    text = updatedTitle.text;
                                    offset = updatedTitle.offset;
                                    logseq.Editor.updateBlock(uuid, text);
                                }
                            });


                        } else {//Cancel
                            //user cancel in dialog
                            logseq.UI.showMsg("Cancel", "warning");
                            Cancel = true;
                        }
                    }
                })
                .finally(() => {
                    logseq.hideMainUI({ restoreEditingCursor: true });
                });
            //dialog end
        }
    }
    return Cancel;
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

const MarkdownLink = () => {
    let blockSet: string = "";
    let processing: boolean = false; // ロック用フラグ

    logseq.DB.onChanged(async ({ txMeta }) => {
        if (processing) { // 処理中の場合はリターンして重複を避ける
            return;
        }
        const currentBlock = await logseq.Editor.getCurrentBlock() as BlockEntity | null;
        if (currentBlock) {
            if (blockSet !== currentBlock.uuid || txMeta?.outlinerOp === 'insertBlocks') {// 他のブロックを触ったら解除する
                processing = true; // ロックをかける
                const cancel = await parseBlockForLink(currentBlock.uuid) as boolean; // キャンセルだったらブロックをロックする
                if (cancel === true) {
                    blockSet = currentBlock.uuid;
                    const textarea = parent.document.querySelector(`#edit-block-1-${currentBlock.uuid}`) as HTMLTextAreaElement;
                    if (textarea) {
                        textarea.addEventListener('blur', () => {
                            // フォーカスが外れたときの処理
                            parseBlockForLink(currentBlock.uuid);
                        }, { once: true });
                    }
                } else {
                    blockSet = "";
                }
            } else {
                blockSet = currentBlock.uuid;
            }
        }
        processing = false; // ロックを解除する
    });
};



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


    //get theme color
    //checkboxなどはCSSで上書きする必要あり
    const rootThemeColor = () => {
        const root = parent.document.querySelector(":root");
        if (root) {
            const rootStyles = getComputedStyle(root);
            background = rootStyles.getPropertyValue("--ls-block-properties-background-color") || "#ffffff";
            color = rootStyles.getPropertyValue("--ls-primary-text-color") || "#000000";
        }
    };
    rootThemeColor();
    logseq.App.onThemeModeChanged(() => { rootThemeColor(); });
    //end


    //markdown link
    MarkdownLink();


    if (logseq.settings!.linkIcon === true) {
        setLinkIcon();
    }

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
    if (doc) {
        doc.remove();
    }
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
