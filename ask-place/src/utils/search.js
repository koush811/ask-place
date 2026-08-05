const JAPANESE_ALIASES = {
  入口: ['いりぐち', 'いりぐち'],
  入り口: ['いりぐち'],
  受付: ['うけつけ'],
  階段: ['かいだん'],
  講義室: ['こうぎしつ'],
  教室: ['きょうしつ'],
  廊下: ['ろうか'],
  食堂: ['しょくどう'],
  図書館: ['としょかん'],
  ラウンジ: ['らうんじ'],
  事務室: ['じむしつ'],
  研究室: ['けんきゅうしつ'],
  スタンプ: ['すたんぷ'],
}

function toHiragana(value) {
  return value.replace(/[ァ-ヴ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
}

function toKatakana(value) {
  return value.replace(/[ぁ-ゔ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60))
}

function normalizeForSearch(value) {
  if (value == null) return ''

  return String(value)
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[\u3000]/g, '')
    .replace(/[ー－‐]/g, '')
    .toLowerCase()
}

export function getSearchVariants(value) {
  const base = normalizeForSearch(value)
  const variants = new Set([base])

  if (!base) return []

  const japaneseText = String(value).normalize('NFKC')
  if (/[ぁ-ゔァ-ヴ一-龯]/u.test(japaneseText)) {
    const hiragana = toHiragana(japaneseText)
    const katakana = toKatakana(japaneseText)
    variants.add(normalizeForSearch(hiragana))
    variants.add(normalizeForSearch(katakana))
  }

  const aliases = JAPANESE_ALIASES[String(value)] || JAPANESE_ALIASES[japaneseText]
  if (aliases) {
    aliases.forEach((alias) => variants.add(normalizeForSearch(alias)))
  }

  return Array.from(variants)
}

export function matchesSearchText(text, query) {
  const queryVariants = getSearchVariants(query)
  const targetVariants = getSearchVariants(text)

  return queryVariants.some((queryVariant) =>
    targetVariants.some((targetVariant) => targetVariant.includes(queryVariant)),
  )
}
