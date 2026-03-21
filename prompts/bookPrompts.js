const BOOK_STYLE_GUIDE = `
Ты пишешь персональную книгу для печати по реальной анкете клиента.
Цель: глубокий, живой, бережный текст без выдуманных фактов.

Обязательные правила:
1) Пиши только на русском языке.
2) Запрещено выдумывать события, даты, имена и детали, которых нет в анкете.
3) Используй конкретику из ответов: сцены, предметы, жесты, фразы, бытовые детали.
4) Избегай общих фраз и шаблонов. Каждый абзац должен опираться на факты.
5) Не используй markdown, служебные комментарии, технические пометки.
6) Не вставляй иностранные слова, иероглифы, «машинный мусор», случайные символы.
`;

function getBookProfile(order) {
  if (order.bookType?.id === 'child') {
    return {
      targetLength: 'теплая детская книга около 25-35 печатных страниц',
      chaptersCount: 10,
      chapterLength: '1000-1600 слов',
      chapterMinWords: 850
    };
  }

  return {
    targetLength: 'полноценная персональная книга около 50-100 печатных страниц',
    chaptersCount: 12,
    chapterLength: '1200-2000 слов',
    chapterMinWords: 950
  };
}

function formatQuestionnaire(order, limit = 80) {
  const fromContext = Array.isArray(order.questionnaireContext?.questions)
    ? order.questionnaireContext.questions
    : null;

  const answers = (fromContext || order.questionnaire?.questions || [])
    .filter((q) => String(q.answer || '').trim())
    .slice(0, limit);

  if (!answers.length) return 'Ответов пока нет.';

  return answers
    .map((q) => {
      const chapter = q.chapter || q.chapterTitle || 'Без главы';
      return `[${chapter}] ${q.number}. ${q.text}\nОтвет: ${q.answer}`;
    })
    .join('\n\n');
}

function formatQuestionnaireStats(order) {
  const stats = order.questionnaireContext?.stats;
  if (!stats) return 'Статистика анкеты: недоступна.';

  return [
    `Статистика анкеты:`,
    `- заполнено ответов: ${stats.answered}`,
    `- средняя длина ответа: ${stats.avgWords} слов`,
    `- суммарно слов: ${stats.totalWords}`
  ].join('\n');
}

function buildOutlinePrompt(order) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Собери детальный план книги.

Тип книги: ${order.bookType.title}
Клиент: ${order.customer.name}
Целевой формат: ${profile.targetLength}
Желаемое количество глав: ${profile.chaptersCount}

Требования к плану:
- Дай названия глав, которые можно отправлять в печать без правок.
- В каждой главе укажи: драматургическую задачу и факты из анкеты.
- Убедись, что все главы разные по функции: ввод, развитие, кульминации, финал.
- Финал должен завершать историю личным посланием.

Верни СТРОГО JSON без markdown:
{
  "title": "...",
  "subtitle": "...",
  "chapters": [
    {"title": "...", "summary": "...", "factsToUse": ["..."]}
  ],
  "finalMessageIdea": "..."
}

${formatQuestionnaireStats(order)}

Анкета:
${formatQuestionnaire(order, 120)}`;
}

function buildChapterPrompt(order, outline, chapter, writtenChapters) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Напиши полноценную главу книги.

Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}
Целевой объем главы: ${profile.chapterLength}
Минимум: не меньше ${profile.chapterMinWords} слов

Название книги: ${outline.title}
Глава: ${chapter.title}
Задача главы: ${chapter.summary}
Ключевые факты для главы: ${(chapter.factsToUse || []).join('; ') || 'используй релевантные ответы анкеты'}

Уже написанные главы:
${writtenChapters.map((item) => `- ${item.title}`).join('\n') || 'пока нет'}

Требования к главе:
- Открывай главу конкретной сценой, а не общими рассуждениями.
- Каждые 2-3 абзаца добавляй материальную деталь: место, вещь, жест, речь, звук.
- Не повторяй соседние главы дословно или по смыслу.
- Заверши главу мягким переходом к следующему эмоциональному этапу.

Анкета для этой главы:
${formatQuestionnaire(order, 60)}

Верни только текст главы.`;
}

function buildExpandChapterPrompt(order, chapter, chapterDraft) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Ты расширяешь уже написанную главу.

Тип книги: ${order.bookType.title}
Глава: ${chapter.title}
Целевой объем: ${profile.chapterLength}

Текущий текст:
${chapterDraft}

Задача:
- Сохрани смысл и факты.
- Добавь новые сцены и наблюдения, без воды.
- Усиль эмоциональную динамику: вход в сцену -> развитие -> тихое завершение.
- Не сокращай текст.

Верни только расширенную главу.`;
}

function buildPolishChapterPrompt(order, chapter, chapterDraft) {
  return `${BOOK_STYLE_GUIDE}
Ты финально редактируешь главу перед сборкой книги.

Тип книги: ${order.bookType.title}
Глава: ${chapter.title}

Текст главы:
${chapterDraft}

Задача:
- Очистить язык и синтаксис.
- Убрать повторы и шум.
- Сохранить факты, тон и объем.

Верни только чистовой текст главы.`;
}

function buildRegenerateChapterPrompt(order, outline, chapter, relatedQuestions, otherChapters, adminInstruction) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Перепиши одну главу заново.

Тип книги: ${order.bookType.title}
Название книги: ${outline.title}
Глава: ${chapter.title}
Задача главы: ${chapter.summary}
Целевой объем: ${profile.chapterLength}
Минимум: ${profile.chapterMinWords} слов

Редакторская инструкция:
${adminInstruction || 'Сделай главу глубже, конкретнее и эмоционально точнее.'}

Соседние главы:
${otherChapters.map((item, i) => `${i + 1}. ${item.title}`).join('\n') || 'нет'}

Релевантные ответы анкеты:
${relatedQuestions
  .filter((q) => String(q.answer || '').trim())
  .map((q) => `${q.number}. ${q.text}\nОтвет: ${q.answer}`)
  .join('\n\n')}

Верни только новый текст главы.`;
}

function buildMergePrompt(order, outline, chapters) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Собери финальную цельную книгу из готовых глав.

Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}
Название: ${outline.title}
Подзаголовок: ${outline.subtitle || ''}
Финальная идея: ${outline.finalMessageIdea || ''}

Задача сборки:
- Сохранить все содержательные факты.
- Убрать дубли между главами.
- Выстроить ровный темп книги.
- Сохранить живой человеческий голос.

Главы:
${chapters.map((chapter, index) => `Глава ${index + 1}: ${chapter.title}\n${chapter.text}`).join('\n\n')}

Верни книгу как цельный текст в порядке:
Название\nПодзаголовок\nКороткое вступление\nГлавы\nФинальное послание.`;
}

function buildEditPrompt(order, draftBook) {
  const profile = getBookProfile(order);

  return `${BOOK_STYLE_GUIDE}
Ты литературный редактор финального текста.

Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}

Что нужно сделать:
- Вычистить языковые ошибки, мусор, неестественные фразы.
- Сохранить факты, имена, хронологию и эмоциональный рисунок.
- Убрать повторы и канцелярит.
- Не сокращать книгу агрессивно.

Черновик:
${draftBook}

Верни только финальный отредактированный текст.`;
}

module.exports = {
  buildOutlinePrompt,
  buildChapterPrompt,
  buildExpandChapterPrompt,
  buildPolishChapterPrompt,
  buildRegenerateChapterPrompt,
  buildMergePrompt,
  buildEditPrompt
};
