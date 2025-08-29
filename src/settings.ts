import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'
import { t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n


/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
export const settingsTemplate = (): SettingSchemaDesc[] => [
             {
                          key: "heading0000",
                          title: t("Update Information"),
                          type: "heading",
                          default: "",
                          description: `

             2025-03-23 🆕
             ${t("Changed the behaviour of this plugin so that instead of using a dialogue, the icon is pressed.")}
             ${t("Paste the URL into the block and press Enter or Esc to exit edit mode.")}
             ${t("Only in non-editing mode, a conversion button appears next to the external link (URL string).")}
             ${t("Pressing the convert button performs the fetch and if the title can be retrieved from the site, the URL string is converted to markdown.")}
             ${t("If you want to undo it, press Ctrl + Z as usual.")}
             `,
             },
             {
                          key: "booleanInsertIfNotFoundTitle",
                          title: t("Convert to markdown even if the title could not be retrieved from the URL."),
                          description: t("Enable"),
                          default: true,
                          type: "boolean",
             },
             {
                          key: "icon",
                          title: t("Change icon (or as text)"),
                          description: t("Emoji or strings"),
                          default: "🔗",
                          type: "string",
             },
             {
                          key: "onlinePDF",
                          type: "boolean",
                          title: t("Download the online PDF file and add to assets"),
                          description: t("Enable"),
                          default: true,
             },
             {
                          key: "keyboardShortcut",
                          title: t("Keyboard shortcut to convert URL at cursor"),
                          description: t("Press this shortcut when cursor is positioned within a URL to convert it to hyperlink"),
                          default: "mod+shift+l",
                          type: "string",
             }

]
