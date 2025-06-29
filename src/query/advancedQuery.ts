import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user"


// クエリを実行
export const advancedQuery = async <T>(query: string, ...input: Array<string>): Promise<T | null> => {
  try {
    const result = await logseq.DB.datascriptQuery(query, ...input)
    return result?.flat() as T
  } catch (err) {
    console.warn("Query execution failed:", err)
    return null
  }
}


export const getContentFromUuid = async (uuid: BlockEntity["uuid"]): Promise<BlockEntity["content"] | null> => {
  const query = `
    [:find (pull ?p [:block/content])
     :where
     [?p :block/uuid ?uuid]
     [(str ?uuid) ?str]
     [(= ?str "${uuid}")]]
  `
  const result = await advancedQuery<{ content: BlockEntity["content"] }[]>(query)
  return result?.[0]?.["content"] ?? null
}

export const getContentFromUuidForDb = async (uuid: BlockEntity["uuid"]): Promise<BlockEntity["content"] | null> => {
  const query = `
    [:find (pull ?p [:block/title])
     :where
     [?p :block/uuid ?uuid]
     [(str ?uuid) ?str]
     [(= ?str "${uuid}")]]
  `
  const result = await advancedQuery<{ title: BlockEntity["content"] }[]>(query)
  return result?.[0]?.["title"] ?? null
}