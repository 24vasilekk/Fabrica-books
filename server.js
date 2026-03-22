const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  buildOutlinePrompt,
  buildChapterPrompt,
  buildExpandChapterPrompt,
  buildPolishChapterPrompt,
  buildRegenerateChapterPrompt,
  buildMergePrompt,
  buildEditPrompt
} = require('./prompts/bookPrompts');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v3.2';
const OPENROUTER_MODEL_OUTLINE = process.env.OPENROUTER_MODEL_OUTLINE || DEFAULT_OPENROUTER_MODEL;
const OPENROUTER_MODEL_WRITER = process.env.OPENROUTER_MODEL_WRITER || DEFAULT_OPENROUTER_MODEL;
const OPENROUTER_MODEL_EDITOR = process.env.OPENROUTER_MODEL_EDITOR || DEFAULT_OPENROUTER_MODEL;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_OUTLINE_MAX_TOKENS = Number(process.env.OPENROUTER_OUTLINE_MAX_TOKENS || 2500);
const OPENROUTER_CHAPTER_MAX_TOKENS = Number(process.env.OPENROUTER_CHAPTER_MAX_TOKENS || 5000);
const OPENROUTER_EXPAND_MAX_TOKENS = Number(process.env.OPENROUTER_EXPAND_MAX_TOKENS || 6500);
const OPENROUTER_EDIT_MAX_TOKENS = Number(process.env.OPENROUTER_EDIT_MAX_TOKENS || 12000);
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 70000);
const OPENROUTER_MAX_RETRIES = Number(process.env.OPENROUTER_MAX_RETRIES || 3);
const CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*';
const SEND_TO_TELEGRAM = process.env.SEND_TO_TELEGRAM === 'true';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_MANAGER_CHAT_ID = process.env.TELEGRAM_MANAGER_CHAT_ID || '';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://${HOST}:${PORT}`;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'book-photos';
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_DIR = path.join(__dirname, 'storage');
const PHOTO_STORAGE_DIR = path.join(STORAGE_DIR, 'photos');
const BOOK_STORAGE_DIR = path.join(STORAGE_DIR, 'books');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const LEGACY_ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MAX_PHOTOS = 50;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

const processingQueue = [];
let isProcessingQueue = false;
const allowedCorsOrigins = parseAllowedCorsOrigins(CORS_ALLOW_ORIGIN);

ensurePersistence();

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = (req.url || '/').split('?')[0];
    const requestOrigin = String(req.headers.origin || '');
    writeCorsHeaders(res, requestOrigin);

    if (req.method === 'OPTIONS' && requestPath.startsWith('/api/')) {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && requestPath === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        mode: OPENROUTER_API_KEY ? 'live-capable' : 'mock-only',
        currentModels: {
          outline: OPENROUTER_MODEL_OUTLINE,
          writer: OPENROUTER_MODEL_WRITER,
          editor: OPENROUTER_MODEL_EDITOR
        },
        telegramConfigured: Boolean(SEND_TO_TELEGRAM && TELEGRAM_BOT_TOKEN && TELEGRAM_MANAGER_CHAT_ID),
        databaseConfigured: true,
        dataStore: isSupabaseConfigured() ? 'supabase+local-json' : 'local-json',
        photoStorageConfigured: true,
        supabaseConfigured: isSupabaseConfigured(),
        queueLength: processingQueue.length,
        currentlyProcessing: isProcessingQueue
      });
    }

    if (req.method === 'GET' && requestPath === '/api/orders') {
      const db = readDb();
      return sendJson(res, 200, {
        orders: db.orders.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      });
    }

    if (req.method === 'GET' && requestPath.startsWith('/api/orders/')) {
      const cleanPath = requestPath;
      const orderId = decodeURIComponent(
        cleanPath
          .replace('/api/orders/', '')
          .replace('/retry', '')
          .replace('/regenerate-chapter', '')
      );
      const order = readDb().orders.find((item) => item.orderId === orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });

      if (req.method === 'GET' && !cleanPath.endsWith('/retry')) {
        return sendJson(res, 200, order);
      }
    }

    if (req.method === 'POST' && requestPath === '/api/orders') {
      const body = await readJson(req);
      const order = normalizeOrder(body);
      validateOrder(order);
      const storedOrder = await saveOrder(order);
      enqueueOrder(storedOrder.orderId);
      return sendJson(res, 202, {
        accepted: true,
        orderId: storedOrder.orderId,
        status: storedOrder.status,
        generationStatus: storedOrder.generationStatus,
        photoCount: storedOrder.photos.length
      });
    }

    if (req.method === 'POST' && requestPath.startsWith('/api/orders/') && requestPath.endsWith('/retry')) {
      const orderId = decodeURIComponent(requestPath.replace('/api/orders/', '').replace('/retry', ''));
      const order = readDb().orders.find((item) => item.orderId === orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });
      await updateStoredOrder(orderId, {
        status: 'queued',
        generationStatus: 'Заказ повторно поставлен в очередь на генерацию.'
      });
      enqueueOrder(orderId);
      return sendJson(res, 202, { accepted: true, orderId, status: 'queued' });
    }

    if (req.method === 'POST' && requestPath.startsWith('/api/orders/') && requestPath.endsWith('/regenerate-chapter')) {
      const orderId = decodeURIComponent(requestPath.replace('/api/orders/', '').replace('/regenerate-chapter', ''));
      const order = readDb().orders.find((item) => item.orderId === orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });
      const body = await readJson(req);
      const chapterIndex = Number(body.chapterIndex);
      const instruction = String(body.instruction || '').trim();
      const updatedOrder = await regenerateChapter(orderId, chapterIndex, instruction);
      return sendJson(res, 200, {
        accepted: true,
        orderId,
        status: updatedOrder.status,
        generationStatus: updatedOrder.generationStatus
      });
    }

    return serveStatic(req, res);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Fabrika Books server started on ${PUBLIC_BASE_URL}`);
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function ensurePersistence() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PHOTO_STORAGE_DIR, { recursive: true });
  fs.mkdirSync(BOOK_STORAGE_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    const legacyOrders = fs.existsSync(LEGACY_ORDERS_FILE)
      ? JSON.parse(fs.readFileSync(LEGACY_ORDERS_FILE, 'utf8'))
      : [];
    fs.writeFileSync(DB_FILE, JSON.stringify({ orders: legacyOrders, statusHistory: [] }, null, 2), 'utf8');
  }

  if (!fs.existsSync(LEGACY_ORDERS_FILE)) {
    fs.writeFileSync(LEGACY_ORDERS_FILE, '[]\n', 'utf8');
  }
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  fs.writeFileSync(LEGACY_ORDERS_FILE, JSON.stringify(db.orders, null, 2), 'utf8');
}

function normalizeOrder(body) {
  return {
    orderId: body.orderId || `FB-BOOKS-${Date.now()}`,
    submittedAt: body.submittedAt || new Date().toISOString(),
    customer: body.customer || {},
    bookType: body.bookType || {},
    payment: body.payment || {},
    questionnaire: body.questionnaire || { questions: [] },
    photos: Array.isArray(body.photos) ? body.photos : [],
    photoComment: body.photoComment || ''
  };
}

function validateOrder(order) {
  if (!String(order.customer.name || '').trim()) throw new Error('Customer name is required');
  if (!String(order.customer.contact || '').trim()) throw new Error('Customer contact is required');
  if (!String(order.bookType.title || '').trim()) throw new Error('Book type is required');
  if (!order.payment || !order.payment.approved) throw new Error('Payment or manager approval is required');
  if (!Array.isArray(order.questionnaire.questions) || !order.questionnaire.questions.length) throw new Error('Questionnaire is empty');
  if (!Array.isArray(order.photos)) throw new Error('Photos must be an array');
  if (order.photos.length > MAX_PHOTOS) throw new Error(`Too many photos: max ${MAX_PHOTOS}`);
  for (const photo of order.photos) {
    const decoded = decodePhotoPreview(photo.preview);
    if (decoded.buffer.length > MAX_PHOTO_BYTES) throw new Error('One of the photos is too large');
  }
}

async function saveOrder(order) {
  const db = readDb();
  const storedPhotos = await persistPhotos(order.orderId, order.photos);
  const storedOrder = {
    ...order,
    photos: storedPhotos,
    status: 'queued',
    generationStatus: 'Заказ поставлен в очередь на генерацию книги.',
    managerDeliveryStatus: '',
    generatedBook: '',
    generatedOutline: null,
    generatedChapters: [],
    aiDiagnostics: null,
    mode: OPENROUTER_API_KEY ? 'pending-live' : 'pending-mock',
    aiProvider: OPENROUTER_API_KEY ? 'openrouter' : 'mock',
    statuses: [
      { status: 'queued', at: new Date().toISOString(), note: 'Заказ поставлен в очередь' }
    ]
  };
  db.orders.push(storedOrder);
  db.statusHistory.push({ orderId: storedOrder.orderId, status: 'queued', at: new Date().toISOString() });
  writeDb(db);
  await syncOrderToSupabase(storedOrder);
  return storedOrder;
}

async function updateStoredOrder(orderId, patch) {
  const db = readDb();
  let updatedOrder = null;
  db.orders = db.orders.map((order) => {
    if (order.orderId !== orderId) return order;
    updatedOrder = {
      ...order,
      ...patch,
      status: patch.status || order.status,
      statuses: [
        ...(order.statuses || []),
        {
          status: patch.status || order.status,
          at: new Date().toISOString(),
          note: patch.generationStatus || patch.managerDeliveryStatus || 'Заказ обновлен'
        }
      ]
    };
    return updatedOrder;
  });
  db.statusHistory.push({ orderId, status: patch.status || 'updated', at: new Date().toISOString() });
  writeDb(db);
  if (updatedOrder) await syncOrderToSupabase(updatedOrder);
  return updatedOrder;
}

function enqueueOrder(orderId) {
  if (!processingQueue.includes(orderId)) processingQueue.push(orderId);
  processQueue().catch((error) => console.error('Queue error', error));
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  try {
    while (processingQueue.length) {
      const orderId = processingQueue.shift();
      await processSingleOrder(orderId);
    }
  } finally {
    isProcessingQueue = false;
  }
}

async function processSingleOrder(orderId) {
  const order = readDb().orders.find((item) => item.orderId === orderId);
  if (!order) return;

  await updateStoredOrder(orderId, {
    status: 'generating',
    generationStatus: 'Сервер генерирует книгу, затем прогоняет ее через редактор и сохраняет результат.'
  });

  try {
    const freshOrder = readDb().orders.find((item) => item.orderId === orderId);
    const generationResult = await generateBook(freshOrder);
    const generatedBookPath = persistGeneratedBook(orderId, generationResult.generatedBook);
    const processedOrder = await updateStoredOrder(orderId, {
      status: generationResult.mode === 'live' ? 'generated' : 'mock-generated',
      generationStatus: generationResult.generationStatus,
      generatedBook: generationResult.generatedBook,
      generatedOutline: generationResult.outline || null,
      generatedChapters: generationResult.chapters || [],
      aiDiagnostics: generationResult.aiDiagnostics || null,
      generatedBookPath,
      mode: generationResult.mode
    });
    const deliveryResult = await notifyManager(processedOrder, generationResult);
    await updateStoredOrder(orderId, {
      status: deliveryResult.sent ? 'sent_to_manager' : processedOrder.status,
      managerDeliveryStatus: deliveryResult.managerDeliveryStatus
    });
  } catch (error) {
    await updateStoredOrder(orderId, {
      status: 'error',
      generationStatus: `Ошибка генерации: ${error.message}`
    });
  }
}

function persistGeneratedBook(orderId, generatedBook) {
  const targetPath = path.join(BOOK_STORAGE_DIR, `${orderId}.txt`);
  fs.writeFileSync(targetPath, generatedBook || '', 'utf8');
  return targetPath;
}

async function persistPhotos(orderId, photos) {
  const orderPhotoDir = path.join(PHOTO_STORAGE_DIR, orderId);
  fs.mkdirSync(orderPhotoDir, { recursive: true });

  const storedPhotos = [];
  for (const [index, photo] of photos.entries()) {
    const decoded = decodePhotoPreview(photo.preview);
    const extension = decoded.extension || 'bin';
    const filename = `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(photo.name || 'photo')}.${extension}`;
    const absolutePath = path.join(orderPhotoDir, filename);
    fs.writeFileSync(absolutePath, decoded.buffer);

    let publicUrl = `${PUBLIC_BASE_URL}/storage/photos/${encodeURIComponent(orderId)}/${encodeURIComponent(filename)}`;
    let storageProvider = 'local';
    if (isSupabaseConfigured()) {
      const uploadedUrl = await uploadToSupabaseStorage(orderId, filename, decoded.buffer, decoded.mimeType);
      if (uploadedUrl) {
        publicUrl = uploadedUrl;
        storageProvider = 'supabase';
      }
    }

    storedPhotos.push({
      id: photo.id || `${orderId}-${index + 1}`,
      name: photo.name || filename,
      storagePath: absolutePath,
      publicUrl,
      storageProvider
    });
  }
  return storedPhotos;
}

function decodePhotoPreview(preview) {
  const match = String(preview || '').match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return { extension: 'bin', mimeType: 'application/octet-stream', buffer: Buffer.from('') };
  const mimeType = match[1];
  return {
    extension: mimeType.split('/')[1].replace('jpeg', 'jpg'),
    mimeType,
    buffer: Buffer.from(match[2], 'base64')
  };
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9а-яА-Я_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'photo';
}

async function uploadToSupabaseStorage(orderId, filename, buffer, mimeType) {
  const objectPath = `${orderId}/${filename}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': mimeType,
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!response.ok) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectPath}`;
}

async function syncOrderToSupabase(order) {
  if (!isSupabaseConfigured()) return;

  const payload = {
    order_id: order.orderId,
    submitted_at: order.submittedAt,
    customer_name: order.customer.name || '',
    customer_contact: order.customer.contact || '',
    book_type_id: order.bookType.id || '',
    book_type_title: order.bookType.title || '',
    payment_method: order.payment.method || '',
    payment_approved: Boolean(order.payment.approved),
    manager_code: order.payment.managerCode || '',
    status: order.status || 'received',
    generation_status: order.generationStatus || '',
    manager_delivery_status: order.managerDeliveryStatus || '',
    generated_book: order.generatedBook || '',
    questionnaire: order.questionnaire || { questions: [] },
    photo_comment: order.photoComment || '',
    photos: order.photos || []
  };

  await fetch(`${SUPABASE_URL}/rest/v1/orders?on_conflict=order_id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  }).catch(() => {});

  await fetch(`${SUPABASE_URL}/rest/v1/order_status_history`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: order.orderId,
      status: order.status || 'received',
      note: order.generationStatus || order.managerDeliveryStatus || 'Order synced',
      created_at: new Date().toISOString()
    })
  }).catch(() => {});
}

async function generateBook(order) {
  if (!OPENROUTER_API_KEY) {
    return {
      mode: 'mock',
      generationStatus: 'OpenRouter API пока не подключен. Сервер собрал mock-книгу и сохранил заказ в базе.',
      generatedBook: buildMockBook(order)
    };
  }

  const sourceQuestions = (order.questionnaire.questions || []).filter((item) => String(item.answer || '').trim());
  const questionnaireContext = enrichQuestionnaireContext(sourceQuestions);
  const timings = {};

  const outlineStart = Date.now();
  const outline = normalizeOutline(
    await callModel(
      buildOutlinePrompt({
        ...order,
        questionnaire: { questions: questionnaireContext.questions },
        questionnaireContext
      }),
      { stage: 'outline', json: true }
    )
  );
  timings.outlineMs = Date.now() - outlineStart;

  const chapters = [];
  for (const chapter of (outline.chapters || []).slice(0, getChapterLimit(order, outline))) {
    const relatedQuestions = pickRelevantQuestions(questionnaireContext.questions, chapter);
    const chapterStart = Date.now();
    const text = await generateChapterText(
      {
        ...order,
        questionnaire: { questions: relatedQuestions },
        questionnaireContext: {
          ...questionnaireContext,
          questions: relatedQuestions
        }
      },
      outline,
      chapter,
      chapters
    );
    timings[`chapter_${chapters.length + 1}_ms`] = Date.now() - chapterStart;
    chapters.push({ title: chapter.title, text });
  }
  const mergeStart = Date.now();
  const mergedBook = await callModel(buildMergePrompt({ ...order, questionnaireContext }, outline, chapters), { stage: 'merge' });
  timings.mergeMs = Date.now() - mergeStart;

  const editStart = Date.now();
  const editedBook = await callModel(buildEditPrompt({ ...order, questionnaireContext }, mergedBook), { stage: 'editor' });
  timings.editMs = Date.now() - editStart;

  const generatedBook = shouldKeepMergedBook(mergedBook, editedBook) ? mergedBook : editedBook;
  const cleanedBook = sanitizeGeneratedText(generatedBook);

  return {
    mode: 'live',
    generationStatus: 'Книга сгенерирована, расширена по главам и прогнана через AI-редактор.',
    generatedBook: cleanedBook,
    outline,
    chapters,
    aiDiagnostics: {
      answeredQuestions: questionnaireContext.stats.answered,
      avgAnswerWords: questionnaireContext.stats.avgWords,
      chapterCount: chapters.length,
      timings
    }
  };
}

function getChapterLimit(order, outline) {
  const outlineCount = Array.isArray(outline?.chapters) ? outline.chapters.length : 12;
  if (order.bookType?.id === 'child') return Math.min(Math.max(outlineCount, 8), 12);
  return Math.min(Math.max(outlineCount, 10), 14);
}

function shouldExpandChapter(order, text) {
  const minWords = order.bookType?.id === 'child' ? 900 : 1000;
  return countWords(text) < minWords;
}

function shouldKeepMergedBook(mergedBook, editedBook) {
  if (!editedBook) return true;
  const mergedWords = countWords(mergedBook);
  const editedWords = countWords(editedBook);
  if (!mergedWords || !editedWords) return false;
  return editedWords < mergedWords * 0.78;
}

function countWords(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

function pickRelevantQuestions(questions, chapter) {
  const hints = String((chapter.factsToUse || []).join(' '))
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);

  const scored = questions.map((item) => {
    const hay = `${item.text || ''} ${item.answer || ''}`.toLowerCase();
    let score = Math.min(countWords(item.answer || ''), 120) / 12;
    for (const hint of hints) {
      if (hay.includes(hint)) score += 2.5;
    }
    if (String(item.chapter || '').toLowerCase() === String(chapter.title || '').toLowerCase()) score += 1;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const limit = questions.length <= 30 ? 30 : 24;
  return scored.slice(0, limit).map((entry) => entry.item);
}

function enrichQuestionnaireContext(answeredQuestions) {
  const questions = answeredQuestions.map((item) => ({
    ...item,
    answer: sanitizeUserText(item.answer || ''),
    chapter: item.chapter || item.chapterTitle || 'Без главы'
  }));
  const grouped = {};
  for (const item of questions) {
    if (!grouped[item.chapter]) grouped[item.chapter] = [];
    grouped[item.chapter].push(item);
  }
  const totalWords = questions.reduce((acc, item) => acc + countWords(item.answer || ''), 0);
  return {
    questions,
    groupedByChapter: grouped,
    stats: {
      answered: questions.length,
      totalWords,
      avgWords: questions.length ? Math.round(totalWords / questions.length) : 0
    }
  };
}

function sanitizeUserText(value) {
  return String(value || '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeGeneratedText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function buildMockBook(order) {
  const answered = (order.questionnaire.questions || []).filter((q) => String(q.answer || '').trim());
  const introFacts = answered.slice(0, 8).map((q) => `- ${q.answer}`).join('\n');
  const bodyFacts = answered.slice(8, 24).map((q) => `${q.number}. ${q.answer}`).join('\n');
  return [
    `${order.bookType.title || 'Персональная книга'}`,
    '',
    `Для клиента: ${order.customer.name || 'Без имени'}`,
    `Контакт: ${order.customer.contact || 'Не указан'}`,
    '',
    'Вступление',
    'Эта книга собрана автоматически на основе анкеты клиента и подготовлена как черновик для редактора и менеджера.',
    '',
    'Ключевые факты',
    introFacts || '- Ответы еще не заполнены подробно.',
    '',
    'Основной текст',
    bodyFacts || 'Недостаточно данных для полного черновика.',
    '',
    'Финальное послание',
    'Следующий шаг: подключить AI API, чтобы вместо mock-текста генерировалась полноценная книга на 50-100 страниц.'
  ].join('\n');
}

async function generateChapterText(order, outline, chapter, previousChapters, adminInstruction = '') {
  let text = await callModel(
    adminInstruction
      ? buildRegenerateChapterPrompt(order, outline, chapter, order.questionnaire.questions || [], previousChapters, adminInstruction)
      : buildChapterPrompt(order, outline, chapter, previousChapters),
    { stage: 'writer' }
  );
  if (shouldExpandChapter(order, text)) {
    text = await callModel(buildExpandChapterPrompt(order, chapter, text), { stage: 'expand' });
  }
  if (shouldExpandChapter(order, text)) {
    text = await callModel(buildExpandChapterPrompt(order, chapter, text), { stage: 'expand' });
  }
  return callModel(buildPolishChapterPrompt(order, chapter, text), { stage: 'editor' });
}

async function regenerateChapter(orderId, chapterIndex, instruction) {
  if (!OPENROUTER_API_KEY) throw new Error('Для точечной перегенерации нужен подключенный OpenRouter API');

  const order = readDb().orders.find((item) => item.orderId === orderId);
  if (!order) throw new Error('Order not found');

  const chapters = Array.isArray(order.generatedChapters) ? order.generatedChapters.slice() : [];
  const outline = order.generatedOutline || buildFallbackOutline();
  const targetChapter = (outline.chapters || [])[chapterIndex];
  if (!targetChapter) throw new Error('Chapter not found');

  await updateStoredOrder(orderId, {
    status: 'generating',
    generationStatus: `Перегенерируем главу ${chapterIndex + 1}: ${targetChapter.title}`
  });

  const sourceQuestions = (order.questionnaire?.questions || []).filter((item) => String(item.answer || '').trim());
  const questionnaireContext = enrichQuestionnaireContext(sourceQuestions);
  const relatedQuestions = pickRelevantQuestions(questionnaireContext.questions, targetChapter);
  const previousChapters = chapters
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.index !== chapterIndex)
    .map((item) => ({ title: item.title, text: item.text }));

  const regeneratedText = await generateChapterText(
    {
      ...order,
      questionnaire: { questions: relatedQuestions },
      questionnaireContext: {
        ...questionnaireContext,
        questions: relatedQuestions
      }
    },
    outline,
    targetChapter,
    previousChapters,
    instruction
  );

  const nextChapters = outline.chapters.slice(0, getChapterLimit(order)).map((chapter, index) => ({
    title: chapter.title,
    text: index === chapterIndex ? regeneratedText : (chapters[index]?.text || '')
  }));

  const chaptersForMerge = nextChapters.filter((item) => String(item.text || '').trim());
  const mergedBook = await callModel(buildMergePrompt({ ...order, questionnaireContext }, outline, chaptersForMerge), { stage: 'merge' });
  const editedBook = await callModel(buildEditPrompt({ ...order, questionnaireContext }, mergedBook), { stage: 'editor' });
  const generatedBook = sanitizeGeneratedText(shouldKeepMergedBook(mergedBook, editedBook) ? mergedBook : editedBook);
  const generatedBookPath = persistGeneratedBook(orderId, generatedBook);

  return updateStoredOrder(orderId, {
    status: 'generated',
    generationStatus: `Глава ${chapterIndex + 1} перегенерирована и книга пересобрана.`,
    generatedBook,
    generatedBookPath,
    generatedOutline: outline,
    generatedChapters: nextChapters
  });
}

async function callModel(prompt, options = {}) {
  const messages = [];
  if (options.json) {
    messages.push({
      role: 'system',
      content:
        'Верни строго валидный JSON без markdown и без пояснений. Формат: {"title":"...","subtitle":"...","finalMessageIdea":"...","chapters":[{"title":"...","summary":"...","factsToUse":["..."]}]}'
    });
  } else {
    messages.push({
      role: 'system',
      content: 'Верни только готовый текст без markdown-обрамления и без пояснений от себя.'
    });
  }
  messages.push({ role: 'user', content: prompt });

  const requestBody = {
    model: pickModelForStage(options.stage),
    messages,
    temperature: pickTemperature(options),
    max_tokens: pickMaxTokensForStage(options.stage),
    provider: {
      sort: 'throughput'
    }
  };
  if (options.json) {
    requestBody.response_format = { type: 'json_object' };
  }

  const result = await callOpenRouterWithRetry(requestBody);
  const text = extractResponseText(result);
  return options.json ? parseOutlineJson(text) : text;
}

async function callOpenRouterWithRetry(body, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': PUBLIC_BASE_URL,
        'X-Title': 'Fabrika Vospominaniy Books'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      if (retryable && attempt < OPENROUTER_MAX_RETRIES) {
        await delay(attempt * 900);
        return callOpenRouterWithRetry(body, attempt + 1);
      }
      throw new Error(`OpenRouter API error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('OpenRouter API error 4') && !message.includes('429')) {
      throw error;
    }
    const canRetry = attempt < OPENROUTER_MAX_RETRIES;
    if (canRetry) {
      await delay(attempt * 900);
      return callOpenRouterWithRetry(body, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickModelForStage(stage) {
  if (stage === 'outline') return OPENROUTER_MODEL_OUTLINE;
  if (stage === 'editor') return OPENROUTER_MODEL_EDITOR;
  return OPENROUTER_MODEL_WRITER;
}

function pickMaxTokensForStage(stage) {
  if (stage === 'outline') return OPENROUTER_OUTLINE_MAX_TOKENS;
  if (stage === 'expand') return OPENROUTER_EXPAND_MAX_TOKENS;
  if (stage === 'merge' || stage === 'editor') return OPENROUTER_EDIT_MAX_TOKENS;
  return OPENROUTER_CHAPTER_MAX_TOKENS;
}

function pickTemperature(options) {
  if (options.json) return 0.2;
  if (options.stage === 'editor') return 0.35;
  if (options.stage === 'merge') return 0.55;
  return 0.8;
}

function extractResponseText(result) {
  return String(result.choices?.[0]?.message?.content || '').trim();
}

function parseOutlineJson(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) {
    throw new Error('Модель вернула пустой outline');
  }

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (_) {}
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
      } catch (_) {}
    }
  }

  return buildFallbackOutline();
}

function normalizeOutline(outline) {
  const fallback = buildFallbackOutline();
  const source = outline && typeof outline === 'object' ? outline : fallback;
  const rawChapters = Array.isArray(source.chapters) ? source.chapters : fallback.chapters;
  const normalizedChapters = rawChapters
    .map((chapter, index) => {
      const title = String(chapter?.title || '').trim() || `Глава ${index + 1}`;
      const summary = String(chapter?.summary || '').trim() || 'Ключевой эпизод этой истории.';
      const factsToUse = Array.isArray(chapter?.factsToUse)
        ? chapter.factsToUse.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      return { title, summary, factsToUse };
    })
    .filter((chapter) => chapter.title)
    .slice(0, 14);

  return {
    title: String(source.title || fallback.title).trim() || fallback.title,
    subtitle: String(source.subtitle || fallback.subtitle).trim() || fallback.subtitle,
    finalMessageIdea: String(source.finalMessageIdea || fallback.finalMessageIdea).trim() || fallback.finalMessageIdea,
    chapters: normalizedChapters.length ? normalizedChapters : fallback.chapters
  };
}

function buildFallbackOutline() {
  return {
    title: 'Персональная книга',
    subtitle: 'Собрано по вашим ответам',
    finalMessageIdea: 'Сохранить тепло, близость и важные моменты.',
    chapters: [
      { title: 'Здравствуй, маленькое чудо', summary: 'Представить ребенка, его имя, возраст, характер и первое ощущение от него.', factsToUse: ['имя', 'возраст', 'характер', 'милые привычки'] },
      { title: 'Обычное счастье каждого дня', summary: 'Показать повседневные ритуалы, смех, любимые фразы и домашнее тепло.', factsToUse: ['привычка', 'смех', 'каждый день', 'объятия'] },
      { title: 'Ваши самые теплые моменты', summary: 'Развернуть один-два самых сильных совместных эпизода в полноценные сцены.', factsToUse: ['воспоминания', 'какао', 'зима', 'совместные моменты'] },
      { title: 'Мир ребенка', summary: 'Раскрыть любимые игры, занятия, игрушки, книги и внутренний мир ребенка.', factsToUse: ['игры', 'игрушки', 'рисование', 'сказки', 'любимые занятия'] },
      { title: 'Мечты, которые растут вместе с ней', summary: 'Поговорить о детских мечтах и надеждах на будущее.', factsToUse: ['мечты', 'море', 'домик', 'будущее'] },
      { title: 'Чему нас учит любовь', summary: 'Показать, как ребенок меняет взрослых, чему учит и за что ему благодарны.', factsToUse: ['благодарность', 'чему научил', 'любовь', 'свет'] },
      { title: 'Письмо в будущее', summary: 'Закончить книгу личным, теплым и поддерживающим обращением к ребенку.', factsToUse: ['пожелания', 'главное послание', 'будущее', 'важные слова'] }
    ]
  };
}

async function notifyManager(order, generationResult) {
  if (!SEND_TO_TELEGRAM) {
    return {
      sent: false,
      managerDeliveryStatus: 'Отправка в Telegram временно отключена. Книга сохранена локально и доступна в админке.'
    };
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_MANAGER_CHAT_ID) {
    return { sent: false, managerDeliveryStatus: 'Telegram Bot API не подключен. Результат сохранен в базе и на сервере.' };
  }

  const message = [
    'Новый заказ Fabrika Books',
    `Заказ: ${order.orderId}`,
    `Клиент: ${order.customer.name}`,
    `Контакт: ${order.customer.contact}`,
    `Тип книги: ${order.bookType.title}`,
    `Статус генерации: ${generationResult.generationStatus}`,
    `Фото: ${(order.photos || []).length} шт.`,
    '',
    `Ответов в анкете: ${(order.questionnaire?.questions || []).filter((item) => String(item.answer || '').trim()).length}`,
    '',
    'Книга будет отправлена следующим сообщением как текстовый файл.'
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_MANAGER_CHAT_ID, text: message })
  });

  if (!response.ok) {
    return { sent: false, managerDeliveryStatus: `Telegram API ответил ошибкой ${response.status}.` };
  }

  const form = new FormData();
  form.append('chat_id', TELEGRAM_MANAGER_CHAT_ID);
  form.append('caption', `Книга по заказу ${order.orderId}`);
  form.append(
    'document',
    new Blob([generationResult.generatedBook || ''], { type: 'text/plain;charset=utf-8' }),
    `${order.orderId}.txt`
  );

  const documentResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: form
  });

  if (!documentResponse.ok) {
    return {
      sent: false,
      managerDeliveryStatus: `Сообщение ушло, но файл книги не отправился. Telegram API ${documentResponse.status}.`
    };
  }

  return { sent: true, managerDeliveryStatus: 'Менеджеру отправлены сообщение и txt-файл с книгой в Telegram.' };
}

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function writeCorsHeaders(res, requestOrigin = '') {
  const allowOrigin = resolveAllowedOrigin(requestOrigin);
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function parseAllowedCorsOrigins(value) {
  const source = String(value || '').trim();
  if (!source || source === '*') return ['*'];
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(requestOrigin) {
  if (allowedCorsOrigins.includes('*')) return '*';
  if (!requestOrigin) {
    return allowedCorsOrigins[0] || '*';
  }
  return allowedCorsOrigins.includes(requestOrigin)
    ? requestOrigin
    : (allowedCorsOrigins[0] || '*');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const requestPath = (req.url || '/').split('?')[0];
  const targetPath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(targetPath).replace(/^\.+/, '');
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) return sendJson(res, 403, { error: 'Forbidden' });

  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: 'Not found' });
    writeCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  return 'text/plain; charset=utf-8';
}
