import '@logseq/libs'; //https://plugins-doc.logseq.com/
import { SettingSchemaDesc, AppUserConfigs, BlockEntity } from '@logseq/libs/dist/LSPlugin.user';
import { setup as l10nSetup, t } from "logseq-l10n"; //https://github.com/sethyuan/logseq-l10n
import ja from "./translations/ja.json";
import Swal from 'sweetalert2';//https://sweetalert2.github.io/
import Encoding from 'encoding-japanese';//https://github.com/polygonplanet/encoding.js

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
        const response = await fetch(url);
        const responseText = await response.text();
        //title convert UTF-8
        let matches;
        if (responseText.match(DEFAULT_REGEX.htmlTitleTag)) {
            matches = await Encoding.convert(responseText.match(DEFAULT_REGEX.htmlTitleTag), 'UTF8', 'AUTO');//エンコード処理(文字化け対策)
        } else {
            //titleタグから得られない場合

        }
        if (matches !== null && matches.length > 1 && matches[2] !== null) {
            return decodeHTML(matches[2].trim());
        }
    } catch (e) {
        console.error(e);
    }

    return '';
}

function convertUrlToMarkdownLink(title: string, url, text, urlStartIndex, offset, applyFormat) {
    if (title) {
        title = includeTitle(title);
    } else {
        return { text, offset };
    }

    const startSection = text.slice(0, urlStartIndex);
    const wrappedUrl = applyFormat(title, url);
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

const parseBlockForLink = async (uuid, sweetAlert2background, sweetAlert2color) => {
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
        //dialog
        await logseq.showMainUI();
        await Swal.fire({
            title: "Convert to markdown link",
            text: `(${url})`,
            icon: "info",
            showCancelButton: true,
            color: sweetAlert2color,
            background: sweetAlert2background,
        })
            .then(async (result) => {
                if (result) {//OK
                    if (result?.value) {
                        let title: string = await getTitle(url) || "";
                        title = await includeTitle(title);
                        await Swal.fire({
                            title: "Edit markdown link title",
                            input: "text",
                            inputValue: title,
                            showCancelButton: false,
                            color: sweetAlert2color,
                            background: sweetAlert2background,
                            inputValidator: (value) => {
                                return new Promise((resolve) => {
                                    if (value) {
                                        resolve("");
                                    } else {
                                        resolve('Input cannot be empty!');
                                    }
                                });
                            },
                        }).then(async (resultEditTitle) => {
                            if (resultEditTitle?.value) {
                                const updatedTitle = await convertUrlToMarkdownLink(resultEditTitle.value, url, text, urlIndex, offset, formatSettings.applyFormat)
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

const MarkdownLink = (sweetAlert2background, sweetAlert2color) => {
    let blockSet: string = "";
    let processing: boolean = false; // ロック用フラグ

    logseq.DB.onChanged(async ({txMeta}) => {
        if (processing) { // 処理中の場合はリターンして重複を避ける
            return;
        }
        const currentBlock = await logseq.Editor.getCurrentBlock();
        if (currentBlock) {
            if (blockSet !== currentBlock.uuid || txMeta?.outlinerOp === 'insertBlocks') {// 他のブロックを触ったら解除する
                processing = true; // ロックをかける
                const cancel = await parseBlockForLink(currentBlock.uuid, sweetAlert2background, sweetAlert2color) as boolean; // キャンセルだったらブロックをロックする
                if (cancel === true) {
                    blockSet = currentBlock.uuid;
                    const textarea = parent.document.querySelector(`#edit-block-1-${currentBlock.uuid}`) as HTMLTextAreaElement;
                    if (textarea) {
                        await textarea.addEventListener('blur', async () => {
                            // フォーカスが外れたときの処理
                            await parseBlockForLink(currentBlock.uuid, sweetAlert2background, sweetAlert2color);
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
    (async () => {
        try {
            await l10nSetup({ builtinTranslations: { ja } });
        } finally {
            /* user settings */
            logseq.useSettingsSchema(settingsTemplate);
            if (!logseq.settings) {
                setTimeout(() => {
                    logseq.showSettingsUI();
                }
                    , 300);
            }
        }
    })();


    //get theme color
    //checkboxなどはCSSで上書きする必要あり
    let background;
    let color;
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
    MarkdownLink(background, color);


    /* Slash Command `create pdf link (online)`  */
    logseq.Editor.registerSlashCommand('create pdf link (online)', async ({ uuid }) => {
        //dialog
        await logseq.showMainUI();
        await Swal.fire({
            title: 'generate markdown',
            html:
                '<input id="title" class="swal2-input" placeholder="link title"/>' +
                '<input id="url" class="swal2-input" placeholder="URL (Online PDF)"/>',
            focusConfirm: false,
            showCancelButton: true,
            color: color,
            background: background,
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) {
                        resolve("");
                    }
                });
            },
            preConfirm: () => {
                const title = (document.getElementById('title') as HTMLInputElement).value;
                const url = (document.getElementById('url') as HTMLInputElement).value;
                return { title: title, url: url };
            },
        }).then((result) => {
            if (result.isConfirmed) {
                let title = result.value?.title || "";
                title = includeTitle(title);
                logseq.Editor.insertBlock(uuid, `![${title}](${result.value?.url})`, { focus: true, sibling: true });
                logseq.UI.showMsg("Done! generate the link online pdf", "info");
            } else {//Cancel
                logseq.UI.showMsg("Cancel", "warning");
            }
        });
        await logseq.hideMainUI();
        //dialog end
    });

    logseq.provideStyle(`
a.external-link::before {
    content: "🔗";
    color: #3dbae3;
}
`);

};/* end_main */



/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
const settingsTemplate: SettingSchemaDesc[] = [

];


logseq.ready(main).catch(console.error);