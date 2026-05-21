const {
  retrieveKnowledgeWithConfidence
} = require('./ragService');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

const mongoURI = 'mongodb://localhost:27017/belle_chatbot';
const PYTHON_API_URL = 'http://localhost:8000/predict';
const ALLOW_MODEL_FALLBACK_FOR_FACTUAL = false;

const PERSONA_SERVICE_URL = 'http://127.0.0.1:8104';
const ENABLE_PERSONA_EVALUATION = true;
const ENABLE_PERSONA_REWRITE = true;
const MAX_PERSONA_REWRITE_ATTEMPTS = 2;

const MODEL_ENDPOINTS = {
  "belle-1": "http://127.0.0.1:8101/predict-intent",
  "belle-2": "http://127.0.0.1:8102/predict",
  "belle-3": "http://127.0.0.1:8103/predict"
};

// =========================
// 0. CALL MODEL
// =========================

async function callBelle1Rnn(userMessage) {
  const response = await axios.post(MODEL_ENDPOINTS["belle-1"], {
    text: userMessage
  });

  const intent = response.data.intent;
  const confidence = response.data.confidence || 0;

  let botResponse = `Belle-1 detected intent: ${intent}.`;

  if (intent === "yesNode") {
    botResponse = "Yes, I understand.";
  } else if (intent === "noNode") {
    botResponse = "No problem. I will change direction.";
  } else if (intent === "stop") {
    botResponse = "Operation stopped.";
  } else if (intent === "process_image") {
    botResponse = "Send me the image, and I will check it.";
  }

  return {
    botResponse,
    intent,
    context: `Belle-1 RNN confidence: ${(confidence * 100).toFixed(2)}%`,
    modelUsed: 'belle-1'
  };
}

async function callBelle2Gpt2(userMessage) {
  const response = await axios.post(MODEL_ENDPOINTS["belle-2"], {
    text: userMessage,
    mode: "transformer"
  });

  return {
    botResponse: response.data.reply,
    intent: response.data.intent || "gpt2_chat",
    context: "Belle-2 GPT-2 transformer model was used.",
    modelUsed: 'belle-2'
  };
}

async function callBelle3Qwen(userMessage, history = [], context = "") {
  const response = await axios.post(MODEL_ENDPOINTS["belle-3"], {
    text: userMessage,
    history,
    context
  });

  return {
    botResponse: response.data.reply,
    intent: response.data.intent || "qwen_chat",
    context: context || "Belle-3 Qwen RAG model was used.",
    modelUsed: 'belle-3'
  };
}

// =========================
// 1. CHAT SCHEMA
// =========================

const chatSchema = new mongoose.Schema({
  userMessage: String,
  botResponse: String,
  intent: String,
  timestamp: { type: Date, default: Date.now }
});

// Ep collection la "chats" cho chac
const Chat = mongoose.model('Chat', chatSchema, 'chats');


// =========================
// 2. KNOWLEDGE SCHEMA FOR RAG
// =========================

const knowledgeSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  category: String,
  subcategory: String,
  content: String,
  tags: [String],
  aliases: [String],
  source: String,
  source_url: String,
  license: String,
  language: String,
  createdAt: { type: Date, default: Date.now }
});

// MongoDB chi cho 1 text index tren 1 collection.
// Gom cac field can search vao cung mot text index.
knowledgeSchema.index({
  id: 'text',
  title: 'text',
  category: 'text',
  subcategory: 'text',
  content: 'text',
  tags: 'text',
  aliases: 'text'
});

// Ep collection la "knowledge", khong de Mongoose tu doi thanh "knowledges"
const Knowledge = mongoose.model('Knowledge', knowledgeSchema, 'knowledge');


// =========================
// 3. PENDING KNOWLEDGE SCHEMA
// =========================

const pendingKnowledgeSchema = new mongoose.Schema({
  userMessage: String,
  extractedText: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const PendingKnowledge = mongoose.model(
  'PendingKnowledge',
  pendingKnowledgeSchema,
  'pending_knowledge'
);


// =========================
// 4. MONGODB CONNECT
// =========================

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Da ket noi thanh cong voi MongoDB Compass!');
    await Knowledge.init();
    console.log('Knowledge text index da san sang!');
  })
  .catch((err) => console.error('Loi ket noi MongoDB:', err));


// =========================
// 5. BASIC UTILS
// =========================

function normalizeUserText(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, ' ');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildHistoryFromChats(chats) {
  const history = [];

  for (const chat of chats) {
    if (chat.userMessage && chat.userMessage.trim()) {
      history.push({
        role: 'user',
        content: chat.userMessage
      });
    }

    if (chat.botResponse && chat.botResponse.trim()) {
      history.push({
        role: 'assistant',
        content: chat.botResponse
      });
    }
  }

  return history;
}

async function getRecentHistory(limit = 6) {
  const recentChats = await Chat.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  recentChats.reverse();
  return buildHistoryFromChats(recentChats);
}

async function saveChat(userMessage, botResponse, intent) {
  const newChat = new Chat({
    userMessage,
    botResponse,
    intent
  });

  await newChat.save();

  return newChat;
}

function buildSuccessResponse(newChat, extra = {}) {
  return {
    message: 'Success',
    data: {
      botResponse: newChat.botResponse,
      userMessage: newChat.userMessage,
      intent: newChat.intent,
      ...extra
    }
  };
}

// =========================
// 5.5 PERSONA EVALUATOR LAYER
// =========================

async function evaluatePersona(userMessage, botResponse) {
  if (!ENABLE_PERSONA_EVALUATION) {
    return {
      ok: false,
      label: 'disabled',
      belle_score: null,
      not_belle_score: null,
      decision: 'disabled'
    };
  }

  try {
    const response = await axios.post(
      `${PERSONA_SERVICE_URL}/persona/evaluate`,
      {
        userMessage,
        response: botResponse
      },
      {
        timeout: 8000
      }
    );

    return {
      ok: true,
      ...response.data
    };
  } catch (error) {
    console.error('[Persona Evaluator Error]', error.message);

    return {
      ok: false,
      label: 'unknown',
      belle_score: null,
      not_belle_score: null,
      decision: 'persona_service_unavailable'
    };
  }
}

function printPersonaLog({
  userMessage,
  botResponse,
  intent,
  personaResult,
  personaAttempts = []
}) {
  console.log('===== PERSONA ENGINE LOG START =====');
  console.log('Intent:', intent);
  console.log('User message:', userMessage);
  console.log('Final response:', botResponse);
  console.log('Persona result:', personaResult);

  if (Array.isArray(personaAttempts) && personaAttempts.length > 0) {
    for (const item of personaAttempts) {
      console.log(`Persona attempt ${item.attempt}:`);
      console.log('Response:', item.response);
      console.log('Persona:', item.persona);
    }
  }

  console.log('===== PERSONA ENGINE LOG END =====');
}

async function saveAndRespondWithPersona(res, {
  userMessage,
  botResponse,
  intent,
  extra = {},
  statusCode = 201
}) {
  const refined = await refinePersonaResponse({
    userMessage,
    botResponse,
    intent
  });

  printPersonaLog({
    userMessage,
    botResponse: refined.finalResponse,
    intent,
    personaResult: refined.personaResult,
    personaAttempts: refined.attempts
  });

  const newChat = await saveChat(
    userMessage,
    refined.finalResponse,
    intent
  );

  return res.status(statusCode).json(
    buildSuccessResponse(newChat, {
      ...extra,
      persona: refined.personaResult,
      personaAttempts: refined.attempts,
      personaRewritten: refined.rewritten,
      originalBotResponse: botResponse
    })
  );
}


// =========================
// 6. MATH CALCULATOR LAYER
// =========================

function safeCalculateExpression(expression) {
  if (!expression || typeof expression !== 'string') return null;

  const cleaned = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .replace(/[?？]/g, '')
    .trim();

  // Chi cho phep so, dau toan, dau cham, ngoac va khoang trang.
  if (!/^[0-9+\-*/().\s]+$/.test(cleaned)) return null;

  // Chan cac bieu thuc qua dai hoac qua la.
  if (cleaned.length > 80) return null;

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned});`)();

    if (!Number.isFinite(result)) return null;

    return {
      expression: cleaned,
      result
    };
  } catch (err) {
    return null;
  }
}

function extractMathExpression(userMessage) {
  const text = String(userMessage || '').trim();

  // Vi du: "What is (10+20) / 5"
  const whatIsMatch = text.match(/(?:what is|calculate|solve|tinh|tính|hay tinh|hãy tính)\s+(.+)/i);
  if (whatIsMatch) {
    return whatIsMatch[1]
      .replace(/[?？]/g, '')
      .trim();
  }

  // Vi du: "10 + 20 / 5"
  if (/[0-9]/.test(text) && /[+\-*/×÷]/.test(text)) {
    return text;
  }

  return null;
}

function trySolveMathCalculation(userMessage) {
  const expression = extractMathExpression(userMessage);
  if (!expression) return null;

  const calculated = safeCalculateExpression(expression);
  if (!calculated) return null;

  return `${calculated.expression} = ${calculated.result}.`;
}


// =========================
// 7. MATH QUIZ LAYER
// =========================

function tryGenerateMathQuiz(userMessage) {
  const text = normalizeUserText(userMessage);

  const asksForMathQuiz =
    /(ask|give|create|make).*(math|arithmetic).*(question|problem)/i.test(text) ||
    /(math question|arithmetic question)/i.test(text) ||
    /(đố|do).*toán/i.test(text) ||
    /(câu hỏi toán|bài toán đơn giản)/i.test(text);

  if (!asksForMathQuiz) {
    return null;
  }

  const operations = ['+', '-', '*', '/'];
  const op = operations[randomInt(0, operations.length - 1)];

  let a;
  let b;

  if (op === '/') {
    b = randomInt(2, 10);
    const result = randomInt(2, 10);
    a = b * result;
  } else {
    a = randomInt(1, 20);
    b = randomInt(1, 20);
  }

  return `What is ${a} ${op} ${b}?`;
}

function parseSimpleMathQuestion(text) {
  if (!text || typeof text !== 'string') return null;

  const match = text.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)/);

  if (!match) return null;

  const a = Number(match[1]);
  const op = match[2];
  const b = Number(match[3]);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  let result;

  if (op === '+') result = a + b;
  else if (op === '-') result = a - b;
  else if (op === '*' || op === '×') result = a * b;
  else if (op === '/' || op === '÷') {
    if (b === 0) return null;
    result = a / b;
  } else {
    return null;
  }

  return {
    expression: `${a} ${op} ${b}`,
    result
  };
}

function extractUserAnswerNumber(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null;

  // Neu user dang hoi phep toan moi, dung coi la dap an quiz.
  if (/[+\-*/×÷]/.test(userMessage)) return null;

  const match = userMessage.match(/-?\d+(?:\.\d+)?/);

  if (!match) return null;

  const number = Number(match[0]);

  if (!Number.isFinite(number)) return null;

  return number;
}

async function getLastMathQuiz() {
  return Chat.findOne({ intent: 'math_quiz_request' })
    .sort({ timestamp: -1 })
    .lean();
}

async function tryCheckMathQuizAnswer(userMessage) {
  const userAnswer = extractUserAnswerNumber(userMessage);

  if (userAnswer === null) return null;

  const lastQuizChat = await getLastMathQuiz();

  if (!lastQuizChat) {
    return null;
  }

  const quiz = parseSimpleMathQuestion(lastQuizChat.botResponse);

  if (!quiz) return null;

  const correct = Math.abs(userAnswer - quiz.result) < 1e-9;

  if (correct) {
    return `Yes. ${quiz.expression} = ${quiz.result}. Your answer is correct.`;
  }

  return `Not quite. ${quiz.expression} = ${quiz.result}, so the correct answer is ${quiz.result}.`;
}


// =========================
// 8. RAG LAYER
// =========================

async function retrieveKnowledge(query, limit = 3) {
  if (!query || !query.trim()) return '';

  try {
    const docs = await Knowledge.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    if (!docs.length) {
      return '';
    }

    return docs.map((doc, index) => {
      return [
        `Source ${index + 1}: ${doc.title || 'Untitled'}`,
        `Category: ${doc.category || ''} / ${doc.subcategory || ''}`,
        `Content: ${doc.content || ''}`,
        `Tags: ${(doc.tags || []).join(', ')}`,
        `Aliases: ${(doc.aliases || []).join(', ')}`,
        `Source URL: ${doc.source_url || ''}`
  ].join("\n");
    }).join('\n\n');

  } catch (err) {
    console.error('Loi retrieveKnowledge:', err.message);
    return '';
  }
}

function buildKnowledgeSearchQuery(userMessage) {
  return String(userMessage || '')
    .replace(/^(tell me about|what is|who is|explain|describe|define|what are|what does)\s+/i, '')
    .replace(/^(hãy nói về|hay noi ve|nói về|noi ve|giải thích|giai thich|là gì|la gi)\s+/i, '')
    .trim();
}


// =========================
// 9. INTENT DETECTION
// =========================

function isSmallTalk(userMessage) {
  const text = normalizeUserText(userMessage);

  const smallTalkPatterns = [
    /^hello$/,
    /^hi$/,
    /^hey$/,
    /^yo$/,
    /^good morning$/,
    /^good afternoon$/,
    /^good evening$/,
    /^how are you$/,
    /^how are you doing$/,
    /^thanks$/,
    /^thank you$/,
    /^ok$/,
    /^okay$/,
    /^nice$/,
    /^great$/,
    /^cool$/,
    /^i mean hello to you$/,
    /^hello to you$/,
    /^xin chao$/,
    /^xin chào$/,
    /^chao$/,
    /^chào$/,
    /^cam on$/,
    /^cảm ơn$/,
    /^duoc$/,
    /^được$/,
    /^ok roi$/,
    /^ok rồi$/
  ];

  return smallTalkPatterns.some(pattern => pattern.test(text));
}

function isPersonaQuestion(userMessage) {
  const text = normalizeUserText(userMessage);

  const personaPatterns = [
    /what is your name/,
    /who are you/,
    /tell me who you are/,
    /where are you from/,
    /are you belle/,
    /your name/,
    /who made you/,
    /who created you/,
    /ban ten gi/,
    /bạn tên gì/,
    /ban la ai/,
    /bạn là ai/,
    /ai tao ra ban/,
    /ai tạo ra bạn/
  ];

  return personaPatterns.some(pattern => pattern.test(text));
}

function isTeachCommand(userMessage) {
  const text = normalizeUserText(userMessage);

  const teachPatterns = [
    /^remember that /,
    /^remember this /,
    /^learn this /,
    /^teach belle that /,
    /^teach you that /,
    /^save this knowledge /,
    /^ghi nho rang /,
    /^ghi nhớ rằng /,
    /^hay nho rang /,
    /^hãy nhớ rằng /,
    /^luu kien thuc /,
    /^lưu kiến thức /
  ];

  return teachPatterns.some(pattern => pattern.test(text));
}

function extractPendingKnowledge(userMessage) {
  return String(userMessage || '')
    .replace(/^remember that\s+/i, '')
    .replace(/^remember this\s+/i, '')
    .replace(/^learn this\s+/i, '')
    .replace(/^teach belle that\s+/i, '')
    .replace(/^teach you that\s+/i, '')
    .replace(/^save this knowledge\s+/i, '')
    .replace(/^ghi nhớ rằng\s+/i, '')
    .replace(/^ghi nho rang\s+/i, '')
    .replace(/^hãy nhớ rằng\s+/i, '')
    .replace(/^hay nho rang\s+/i, '')
    .replace(/^lưu kiến thức\s+/i, '')
    .replace(/^luu kien thuc\s+/i, '')
    .trim();
}

function isFactualQuestion(userMessage) {
  const text = normalizeUserText(userMessage);

  if (!text) return false;

  // Cau qua ngan rat de search sai, vi du: "hello", "14", "ok".
  if (text.split(' ').length <= 2) return false;

  const factualPatterns = [
    /what is/,
    /who is/,
    /what are/,
    /what does/,
    /tell me about/,
    /explain/,
    /describe/,
    /define/,
    /difference between/,
    /how does/,
    /how do/,
    /why/,
    /where is/,
    /when/,
    /history of/,
    /meaning of/,
    /là gì/,
    /la gi/,
    /ai là/,
    /ai la/,
    /nói về/,
    /noi ve/,
    /giải thích/,
    /giai thich/,
    /khác nhau/,
    /khac nhau/,
    /tại sao/,
    /tai sao/,
    /như thế nào/,
    /nhu the nao/
  ];

  return factualPatterns.some(pattern => pattern.test(text));
}

async function detectIntent(userMessage) {
  // Thu tu rat quan trong.
  // Dap an quiz nhu "14" phai duoc check truoc normal chat.
  const mathQuizAnswer = await tryCheckMathQuizAnswer(userMessage);
  if (mathQuizAnswer) {
    return {
      intent: 'math_quiz_answer',
      directReply: mathQuizAnswer
    };
  }

  const mathQuiz = tryGenerateMathQuiz(userMessage);
  if (mathQuiz) {
    return {
      intent: 'math_quiz_request',
      directReply: mathQuiz
    };
  }

  if (isTeachCommand(userMessage)) {
    return {
      intent: 'teach_command'
    };
  }

  const mathCalculation = trySolveMathCalculation(userMessage);
  if (mathCalculation) {
    return {
      intent: 'math_calculation',
      directReply: mathCalculation
    };
  }

  if (isSmallTalk(userMessage)) {
    return {
      intent: 'small_talk'
    };
  }

  if (isPersonaQuestion(userMessage)) {
    return {
      intent: 'persona'
    };
  }

  if (isFactualQuestion(userMessage)) {
    return {
      intent: 'factual_question'
    };
  }

  return {
    intent: 'normal_chat'
  };
}


// =========================
// 10. RESPONSE HANDLERS
// =========================

function personaReply(userMessage) {
  const text = normalizeUserText(userMessage);

  if (/who made you|who created you|ai tao ra ban|ai tạo ra bạn/.test(text)) {
    return 'I was programmed by Phat and his friend.';
  }

  if (/where are you from/.test(text)) {
    return 'I am Belle, a Proxy from Zenless Zone Zero.';
  }

  if (/what is your name|your name|ban ten gi|bạn tên gì/.test(text)) {
    return 'My name is Belle.';
  }

  return 'I am Belle, a Proxy from Zenless Zone Zero.';
}

function smallTalkReply(userMessage) {
  const text = normalizeUserText(userMessage);

  if (/good morning|chao buoi sang|chào buổi sáng/.test(text)) {
    return 'Good morning. How can I help you today?';
  }

  if (/good afternoon|chao buoi chieu|chào buổi chiều/.test(text)) {
    return 'Good afternoon. How can I help you?';
  }

  if (/good evening|chao buoi toi|chào buổi tối/.test(text)) {
    return 'Good evening. How can I help you?';
  }

  if (/thanks|thank you|cam on|cảm ơn/.test(text)) {
    return 'You are welcome. Commission cleared.';
  }

  if (/how are you/.test(text)) {
    return "I'm doing fine. Ready for the next commission.";
  }

  if (/ok|okay|nice|great|cool|duoc|được/.test(text)) {
    return "Got it. I'll keep it clean.";
  }

  return "Hey, I'm here. What's the next commission?";
}

function getPersonaThreshold(intent) {
  const thresholds = {
    small_talk: 0.85,
    persona: 0.85,

    math_calculation: 0.70,
    math_quiz_request: 0.70,
    math_quiz_answer: 0.70,

    factual_question: 0.70,
    normal_chat: 0.80,
    teach_command: 0.60
  };

  return thresholds[intent] ?? 0.80;
}

function needsTonePolish(botResponse, intent) {
  const text = String(botResponse || '').trim().toLowerCase();

  if (!text) return false;

  if (intent === 'normal_chat') {
    if (text.startsWith("i can't")) return true;
    if (text.startsWith('i cannot')) return true;
    if (text.startsWith('i can’t')) return true;
    if (text.includes('without seeing it')) return true;
    if (text.includes('unless you show me')) return true;
  }

  if (intent === 'factual_question') {
    if (text.includes('category on wikipedia')) return true;
    if (text.includes('wikipedia category')) return true;
  }

  return false;
}

function polishBadFactualPhrases(botResponse) {
  let text = String(botResponse || '').trim();

  if (!text) return text;

  // 1. Xoa nguyen cau chua metadata noi bo / category / Wikipedia.
  // Vi du:
  // "The game is set in a Zenless Zone Zero category and is known for..."
  // "It has a Zenless Zone Zero category on Wikipedia."
  // "For Belle, this topic helps answer basic questions about the game world and its tone."
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];

  const cleanedSentences = sentences
    .map(sentence => sentence.trim())
    .filter(sentence => {
      const s = sentence.toLowerCase();

      const isBadMetadata =
        s.includes('category on wikipedia') ||
        s.includes('wikipedia category') ||
        s.includes('zenless zone zero category') ||
        s.startsWith('for belle,') ||
        s.includes('for belle, this topic') ||
        s.includes('helps answer basic questions') ||
        s.includes('game world and its tone') ||
        /\bcategory\b/.test(s);

      return !isBadMetadata;
    });

  text = cleanedSentences.join(' ').trim();

  // 2. Sua mot so cum xau neu con sot.
  const badPatterns = [
    /\bFor Belle,\s*this topic helps answer basic questions about the game world and its tone\.?/gi,
    /\bFor Belle,\s*this topic helps answer basic questions.*?\.?/gi,
    /\bThis topic helps answer basic questions about the game world and its tone\.?/gi,

    /\bThe game has a Zenless Zone Zero category on Wikipedia\.?/gi,
    /\bIt has a Zenless Zone Zero category on Wikipedia\.?/gi,
    /\bThere is a Zenless Zone Zero category on Wikipedia\.?/gi,

    /\bThe game has a Zenless Zone Zero category\.?/gi,
    /\bIt has a Zenless Zone Zero category\.?/gi,
    /\bThere is a Zenless Zone Zero category\.?/gi,

    /\bThe game is set in a Zenless Zone Zero category\.?/gi,
    /\bIt is set in a Zenless Zone Zero category\.?/gi,

    /\bThe game is set in an? .* category\.?/gi,
    /\bIt is set in an? .* category\.?/gi,

    /\bThe game has an? .* category on Wikipedia\.?/gi,
    /\bIt has an? .* category on Wikipedia\.?/gi,
    /\bThere is an? .* category on Wikipedia\.?/gi,

    /\bThe game has an? .* category\.?/gi,
    /\bIt has an? .* category\.?/gi,
    /\bThere is an? .* category\.?/gi
  ];

  for (const pattern of badPatterns) {
    text = text.replace(pattern, '').trim();
  }

  // 3. Don dau cau.
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  return text;
}

function normalizeForCompare(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function polishUnhelpfulDebugReply(botResponse, userMessage, intent, personaResult = null) {
  const text = String(botResponse || '').trim();
  const lowerText = text.toLowerCase();
  const lowerUser = String(userMessage || '').toLowerCase();

  const isDebugRequest =
    intent === 'normal_chat' &&
    (
      lowerUser.includes('debug') ||
      lowerUser.includes('code') ||
      lowerUser.includes('error') ||
      lowerUser.includes('bug')
    );

  if (!isDebugRequest) {
    return text;
  }

  const score = personaResult ? Number(personaResult.belle_score || 0) : null;

  const soundsUnhelpful =
    lowerText.startsWith("i can't") ||
    lowerText.startsWith('i cannot') ||
    lowerText.startsWith('i can’t') ||
    lowerText.includes('without seeing it') ||
    lowerText.includes('unless you show me');

  const soundsGeneric =
    lowerText.includes('please provide the code') ||
    lowerText.includes('please share your code') ||
    lowerText.includes('any error messages') ||
    lowerText.includes('i can help you debug');

  const weakPersona = score !== null && score < 0.8;

  if (soundsUnhelpful || soundsGeneric || weakPersona) {
    return "Sure. Send me the code and the error message, and we'll track the bug step by step.";
  }

  return text;
}

function polishResponseBeforePersona({
  userMessage,
  botResponse,
  intent,
  personaResult = null
}) {
  let text = String(botResponse || '').trim();

  if (intent === 'factual_question') {
    text = polishBadFactualPhrases(text);
  }

  text = polishUnhelpfulDebugReply(
    text,
    userMessage,
    intent,
    personaResult
  );

  return text;
}


function applyIntentPersonaDecision(personaResult, intent) {
  const safePersonaResult = personaResult || {
    ok: false,
    label: 'unknown',
    belle_score: null,
    not_belle_score: null,
    decision: 'persona_result_missing'
  };

  const threshold = getPersonaThreshold(intent);

  // Neu service persona bi tat/bi loi, khong duoc lam crash API.
  if (!safePersonaResult.ok) {
    return {
      ...safePersonaResult,
      threshold,
      decisionByIntent: safePersonaResult.decision || 'skip_persona_decision'
    };
  }

  const score = Number(safePersonaResult.belle_score || 0);

  let decisionByIntent = 'rewrite_needed';

  if (score >= threshold) {
    decisionByIntent = 'accept';
  } else if (score >= threshold - 0.15) {
    decisionByIntent = 'weak_persona';
  }

  return {
    ...safePersonaResult,
    threshold,
    decisionByIntent
  };
}

async function rewriteWithBellePersona({
  userMessage,
  originalResponse,
  intent
}) {
  const rewritePrompt = [
    "Rewrite the assistant response in Belle's persona.",
    "",
    "Rules:",
    "- Keep the same useful meaning and factual content.",
    "- Do not add unsupported facts.",
    "- Remove awkward source/meta wording such as Wikipedia category notes.",
    "- Keep a similar length.",
    "- Make it sound natural, helpful, concise, and Belle-like.",
    "- Avoid robotic AI wording.",
    "- If the original response is an unhelpful refusal, turn it into a helpful request for the needed information.",
    "- Return only the rewritten response.",
    "",
    `Intent: ${intent}`,
    `User message: ${userMessage}`,
    "",
    `Original response: ${originalResponse}`
  ].join("\n");

  const modelResult = await callBelleModel({
    userMessage: rewritePrompt,
    history: [],
    context: ''
  });

  return cleanModelReply(modelResult.botResponse);
}

function shouldRewritePersona({ personaResult, botResponse, intent }) {
  if (!ENABLE_PERSONA_REWRITE) return false;
  if (!personaResult || !personaResult.ok) return false;

  // Khong rewrite toan/de lenh luu knowledge de tranh pha ket qua hoac logic he thong.
  const noRewriteIntents = [
    'math_calculation',
    'math_quiz_request',
    'math_quiz_answer',
    'teach_command'
  ];

  if (noRewriteIntents.includes(intent)) {
    return false;
  }

  if (needsTonePolish(botResponse, intent)) {
    return true;
  }

  return personaResult.decisionByIntent !== 'accept';
}

async function refinePersonaResponse({
  userMessage,
  botResponse,
  intent
}) {
  let currentResponse = polishResponseBeforePersona({
    userMessage,
    botResponse,
    intent
  });

  let currentPersona = await evaluatePersona(userMessage, currentResponse);
  currentPersona = applyIntentPersonaDecision(currentPersona, intent);

  const polishedAfterScore = polishResponseBeforePersona({
    userMessage,
    botResponse: currentResponse,
    intent,
    personaResult: currentPersona
  });

  if (normalizeForCompare(polishedAfterScore) !== normalizeForCompare(currentResponse)) {
    currentResponse = polishedAfterScore;

    currentPersona = await evaluatePersona(userMessage, currentResponse);
    currentPersona = applyIntentPersonaDecision(currentPersona, intent);
  }

  const attempts = [
    {
      attempt: 0,
      response: currentResponse,
      persona: currentPersona
    }
  ];

  if (!shouldRewritePersona({
    personaResult: currentPersona,
    botResponse: currentResponse,
    intent
  })) {
    return {
      finalResponse: currentResponse,
      personaResult: currentPersona,
      attempts,
      rewritten: false
    };
  }

  for (let attempt = 1; attempt <= MAX_PERSONA_REWRITE_ATTEMPTS; attempt++) {
    try {
      let rewritten = await rewriteWithBellePersona({
        userMessage,
        originalResponse: currentResponse,
        intent
      });

      rewritten = polishResponseBeforePersona({
        userMessage,
        botResponse: rewritten,
        intent
      });

      if (!rewritten || !rewritten.trim()) {
        break;
      }

      if (normalizeForCompare(rewritten) === normalizeForCompare(currentResponse)) {
        console.log('[Persona Rewrite] Rewritten response is unchanged. Stop retrying.');
        break;
      }

      let newPersona = await evaluatePersona(userMessage, rewritten);
      newPersona = applyIntentPersonaDecision(newPersona, intent);

      attempts.push({
        attempt,
        response: rewritten,
        persona: newPersona
      });

      const oldScore = Number(currentPersona.belle_score || 0);
      const newScore = Number(newPersona.belle_score || 0);

      if (newScore >= oldScore || needsTonePolish(currentResponse, intent)) {
        currentResponse = rewritten;
        currentPersona = newPersona;
      }

      if (newPersona.decisionByIntent === 'accept') {
        break;
      }
    } catch (error) {
      console.error('[Persona Rewrite Error]', error.message);
      break;
    }
  }

  return {
    finalResponse: currentResponse,
    personaResult: currentPersona,
    attempts,
    rewritten: attempts.length > 1
  };
}



function cleanModelReply(reply) {
  let text = String(reply || '').trim();

  const cutMarkers = [
    '[KNOWLEDGE_RETRIEVED]',
    '===== RAG CONTEXT START =====',
    'Source 1:'
  ];

  for (const marker of cutMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      text = text.slice(0, index).trim();
    }
  }

  return text;
}

async function callBelleModel({ userMessage, history = [], context = '' }) {
  const response = await axios.post('http://127.0.0.1:8103/predict', {
    text: userMessage,
    history,
    context
  });

  return {
    botResponse: cleanModelReply(response.data.reply || 'Belle-3 did not return a reply.'),
    intent: response.data.intent || 'qwen_chat'
  };
}

async function handleTeachCommand(userMessage) {
  const extractedText = extractPendingKnowledge(userMessage);

  if (!extractedText) {
    return 'I can save it, but please write the knowledge after the command.';
  }

  await PendingKnowledge.create({
    userMessage,
    extractedText,
    status: 'pending'
  });

  return 'I saved that as pending knowledge. It is not added to my main knowledge base yet.';
}

async function handleFactualQuestion(userMessage, history) {
  const ragResult = await retrieveKnowledgeWithConfidence(
    Knowledge,
    userMessage,
    {
      limit: 3,
      minConfidence: 0.45
    }
  );

  console.log(`Knowledge search query: ${ragResult.searchQuery}`);
  console.log('RAG confidence:', ragResult.confidence);

  if (!ragResult.usedRag) {
    if (!ALLOW_MODEL_FALLBACK_FOR_FACTUAL) {
      return {
        botResponse: "I don't have enough reliable knowledge about that in my database yet.",
        context: '',
        usedRag: false,
        confidence: ragResult.confidence
      };
    }

    const modelResult = await callBelleModel({
      userMessage,
      history,
      context: ''
    });

    return {
      botResponse: modelResult.botResponse,
      context: '',
      usedRag: false,
      confidence: ragResult.confidence
    };
  }

  const modelResult = await callBelleModel({
    userMessage,
    history,
    context: ragResult.context
  });

  return {
    botResponse: modelResult.botResponse,
    context: ragResult.context,
    usedRag: true,
    confidence: ragResult.confidence
  };
}


// =========================
// 11. CHAT API
// =========================

app.post('/api/chat', async (req, res) => {
  try {
    const { userMessage, model } = req.body;

    const selectedModel = model || 'belle-3';

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: 'Tin nhan rong!' });
    }

    console.log(`User hoi Belle: ${userMessage}`);
    console.log(`Selected model: ${selectedModel}`);

    // =====================================================
    // MANUAL MODEL SWITCH
    // Belle-1 va Belle-2 di truc tiep, khong qua RAG cu
    // =====================================================

    if (selectedModel === 'belle-1') {
      const result = await callBelle1Rnn(userMessage);

      const newChat = await saveChat(
        userMessage,
        result.botResponse,
        result.intent
      );

      return res.status(201).json(
        buildSuccessResponse(newChat, {
          context: result.context,
          usedRag: false,
          modelUsed: result.modelUsed
        })
      );
    }

    if (selectedModel === 'belle-2') {
      const result = await callBelle2Gpt2(userMessage);

      const newChat = await saveChat(
        userMessage,
        result.botResponse,
        result.intent
      );

      return res.status(201).json(
        buildSuccessResponse(newChat, {
          context: result.context,
          usedRag: false,
          modelUsed: result.modelUsed
        })
      );
    }

    // =====================================================
    // Belle-3 hoac Auto: dung logic cu cua ban
    // =====================================================

    const route = await detectIntent(userMessage);
    console.log(`Intent Router v1: ${route.intent}`);

    // LUONG 1: Direct replies tu Node, khong goi RAG, khong goi app.py.
    if (route.directReply) {
    return saveAndRespondWithPersona(res, {
      userMessage,
      botResponse: route.directReply,
      intent: route.intent,
      extra: {
        context: '',
        usedRag: false,
        modelUsed: selectedModel
      }
    });
  }

        // LUONG 2: Teach command -> luu pending_knowledge, khong goi RAG.
    if (route.intent === 'teach_command') {
      const botResponse = await handleTeachCommand(userMessage);

      return saveAndRespondWithPersona(res, {
        userMessage,
        botResponse,
        intent: route.intent,
        extra: {
          context: '',
          usedRag: false,
          modelUsed: selectedModel
        }
      });
    }

    // LUONG 3: Small talk -> Node tra loi don gian, khong RAG.
    if (route.intent === 'small_talk') {
      const botResponse = smallTalkReply(userMessage);

      return saveAndRespondWithPersona(res, {
        userMessage,
        botResponse,
        intent: route.intent,
        extra: {
          context: '',
          usedRag: false,
          modelUsed: selectedModel
        }
      });
    }

    // LUONG 4: Persona -> Node tra loi co dinh, khong RAG.
    if (route.intent === 'persona') {
      const botResponse = personaReply(userMessage);

      return saveAndRespondWithPersona(res, {
        userMessage,
        botResponse,
        intent: route.intent,
        extra: {
          context: '',
          usedRag: false,
          modelUsed: selectedModel
        }
      });
    }

    const history = await getRecentHistory(6);
    console.log(`Dang gui ${history.length} tin nhan lich su sang Belle neu can...`);

    // LUONG 5: Factual question -> chi luc nay moi dung RAG.
    if (route.intent === 'factual_question') {
      const result = await handleFactualQuestion(userMessage, history);

      return saveAndRespondWithPersona(res, {
        userMessage,
        botResponse: result.botResponse,
        intent: route.intent,
        extra: {
          context: result.context,
          usedRag: result.usedRag,
          ragConfidence: result.confidence,
          modelUsed: selectedModel
        }
      });
    }

    // LUONG 6: Normal chat -> Belle-3 Qwen tra loi binh thuong
    const modelResult = await callBelleModel({
      userMessage,
      history,
      context: ''
    });

    return saveAndRespondWithPersona(res, {
      userMessage,
      botResponse: modelResult.botResponse,
      intent: route.intent,
      extra: {
        context: '',
        usedRag: false,
        modelUsed: selectedModel
      }
    });

  } catch (error) {
    console.error('Loi:', error.message);
    return res.status(500).json({ error: 'He thong dang bao tri nao bo!' });
  }
});

// =========================
// 11.5 FETCH HISTORY API 
// =========================
app.get('/api/history', async (req, res) => {
  try {
    // Lấy 15 câu hỏi gần nhất của User
    const history = await Chat.find({ userMessage: { $ne: null } })
      .sort({ timestamp: -1 })
      .limit(15)
      .select('userMessage intent timestamp')
      .lean();
    return res.status(200).json({ message: 'Success', data: history });
  } catch (error) {
    return res.status(500).json({ error: 'Khong the lay lich su' });
  }
});


// =========================
// 12. START SERVER
// =========================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Node.js backend dang chay tai http://localhost:${PORT}`);
});
