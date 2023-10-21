import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'
import { t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
    

/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
export const settingsTemplate= (): SettingSchemaDesc[] => [
    {
        key: "bulletMenuOnly",
        type: "boolean",
        title: t("Only when called from the bulleted context menu, not when a URL is pasted. Enabling this will do nothing when pasted."),
        description: "default: false",
        default: false,
    },
    {
        key: "onlinePDF",
        type: "boolean",
        title: t("Download the online PDF file and add to assets"),
        description: "default: true",
        default: true,
    }
]
