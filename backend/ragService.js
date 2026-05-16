// ragService.js

function cleanKnowledgeQuery(userMessage) {
  return String(userMessage || '')
    .replace(/^(okay|ok|please|pls|can you|could you)\s+/i, '')
    .replace(/^(tell me about|what is|who is|explain|describe|define|what are|what does)\s+/i, '')
    .replace(/^(hãy nói về|hay noi ve|nói về|noi ve|giải thích|giai thich|là gì|la gi)\s+/i, '')
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatKnowledgeContext(docs) {
  return docs.map((doc, index) => {
    return [
      `Source ${index + 1}: ${doc.title || 'Untitled'}`,
      `Category: ${doc.category || ''} / ${doc.subcategory || ''}`,
      `Content: ${doc.content || ''}`,
      `Tags: ${(doc.tags || []).join(', ')}`,
      `Aliases: ${(doc.aliases || []).join(', ')}`,
      `Source URL: ${doc.source_url || ''}`
    ].join('\n');
  }).join('\n\n');
}

function calculateConfidence(docs, query) {
  if (!docs || docs.length === 0) {
    return {
      score: 0,
      reason: 'no_docs'
    };
  }

  const topDoc = docs[0];
  const mongoScore = Number(topDoc.score || 0);

  const queryWords = cleanKnowledgeQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 3);

  const searchableText = [
    topDoc.title,
    topDoc.category,
    topDoc.subcategory,
    topDoc.content,
    ...(topDoc.tags || []),
    ...(topDoc.aliases || [])
  ]
    .join(' ')
    .toLowerCase();

  let matchedWords = 0;

  for (const word of queryWords) {
    if (searchableText.includes(word)) {
      matchedWords++;
    }
  }

  const wordMatchRatio = queryWords.length > 0
    ? matchedWords / queryWords.length
    : 0;

  let confidence = 0;

  if (mongoScore >= 5) confidence += 0.45;
  else if (mongoScore >= 2) confidence += 0.3;
  else if (mongoScore >= 1) confidence += 0.15;

  confidence += wordMatchRatio * 0.45;

  if (docs.length >= 2) confidence += 0.1;

  confidence = Math.min(confidence, 1);

  return {
    score: confidence,
    mongoScore,
    wordMatchRatio,
    matchedWords,
    totalQueryWords: queryWords.length,
    reason: 'calculated'
  };
}

async function retrieveKnowledgeWithConfidence(Knowledge, userMessage, options = {}) {
  const {
    limit = 3,
    minConfidence = 0.45
  } = options;

  const searchQuery = cleanKnowledgeQuery(userMessage);

  if (!searchQuery || searchQuery.split(/\s+/).length < 1) {
    return {
      usedRag: false,
      context: '',
      searchQuery,
      confidence: {
        score: 0,
        reason: 'empty_query'
      },
      docs: []
    };
  }

  try {
    const docs = await Knowledge.find(
      { $text: { $search: searchQuery } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    const confidence = calculateConfidence(docs, searchQuery);

    if (!docs.length || confidence.score < minConfidence) {
      return {
        usedRag: false,
        context: '',
        searchQuery,
        confidence,
        docs: []
      };
    }

    return {
      usedRag: true,
      context: formatKnowledgeContext(docs),
      searchQuery,
      confidence,
      docs
    };

  } catch (err) {
    console.error('Loi retrieveKnowledgeWithConfidence:', err.message);

    return {
      usedRag: false,
      context: '',
      searchQuery,
      confidence: {
        score: 0,
        reason: 'search_error',
        error: err.message
      },
      docs: []
    };
  }
}

module.exports = {
  cleanKnowledgeQuery,
  retrieveKnowledgeWithConfidence
};