
export const timestamp = () =>
    new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[-:]/g, "")
        .replace("T", "_")
