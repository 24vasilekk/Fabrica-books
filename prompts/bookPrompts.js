const BOOK_STYLE_GUIDE = `
Ты пишешь персональную книгу для печати.
Стиль: теплый, литературный, эмоциональный, без канцелярита.
Запрещено: выдумывать критически важные факты, противоречить анкете, писать сухо и шаблонно.
Нужно: сохранять человеческий тон, использовать реальные детали из ответов, делать плавные переходы между главами.
Пиши только на русском языке.
Запрещено вставлять английские слова, китайские иероглифы, билингвальные фрагменты, случайные символы и машинный мусор.
`;

function getBookProfile(order) {
  if (order.bookType?.id === 'child') {
    return {
      targetLength: 'теплая детская книга примерно на 25-35 печатных страниц',
      chaptersCount: 12,
      chapterLength: '1200-1800 слов',
      chapterMinWords: 900
    };
  }

  return {
    targetLength: 'полноценная персональная книга примерно на 50-100 печатных страниц',
    chaptersCount: 12,
    chapterLength: '1200-2200 слов',
    chapterMinWords: 1000
  };
}

function buildOutlinePrompt(order) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Собери подробный план книги.
Тип книги: ${order.bookType.title}
Клиент: ${order.customer.name}
Целевой формат: ${profile.targetLength}
Количество глав: ${profile.chaptersCount}
Важно: названия глав и весь план должны быть только на русском языке.

Верни JSON-структуру:
{
  "title": "...",
  "subtitle": "...",
  "chapters": [
    {"title": "...", "summary": "...", "factsToUse": ["..."]}
  ],
  "finalMessageIdea": "..."
}

Анкета:
${order.questionnaire.questions.map((q) => `${q.number}. ${q.text}\nОтвет: ${q.answer || 'не заполнено'}`).join('\n\n')}`;
}

function buildChapterPrompt(order, outline, chapter, writtenChapters) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Напиши главу книги.
Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}
Объем главы: ${profile.chapterLength}
Название книги: ${outline.title}
Глава: ${chapter.title}
Задача главы: ${chapter.summary}
Факты для использования: ${(chapter.factsToUse || []).join('; ')}
Важно:
- пиши только на русском языке
- не используй английские слова и иностранные вставки
- делай сцену живой и подробной
- добавляй больше деталей, эмоций, наблюдений и мягких переходов
- не повторяй один и тот же абзац разными словами
- не делай главу короткой заметкой: это должна быть развернутая глава книги
- старайся приблизиться к нижней границе объема и не заканчивать текст слишком рано

Уже написанные главы:
${writtenChapters.map((item) => `- ${item.title}`).join('\n') || 'пока нет'}

Анкета:
${order.questionnaire.questions.map((q) => `${q.number}. ${q.text}\nОтвет: ${q.answer || 'не заполнено'}`).join('\n\n')}

Верни только текст главы без пояснений.`;
}

function buildExpandChapterPrompt(order, chapter, chapterDraft) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Ты дорабатываешь уже написанную главу книги.
Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}
Целевой объем главы: ${profile.chapterLength}
Глава: ${chapter.title}
Задача главы: ${chapter.summary}

Текущий черновик главы:
${chapterDraft}

Твоя задача:
- сделать главу длиннее и глубже
- добавить больше живых сцен, мелких деталей, образов и эмоций
- усилить теплоту и литературность
- сохранить все уже имеющиеся факты
- писать только на русском языке
- не добавлять мусор, англоязычные слова и случайные символы
- обязательно заметно увеличить объем текста, а не просто слегка переписать фразы
- довести главу хотя бы до полноценной книжной сцены с началом, развитием и мягким завершением

Верни только улучшенную и расширенную версию этой главы без комментариев.`;
}

function buildPolishChapterPrompt(order, chapter, chapterDraft) {
  return `${BOOK_STYLE_GUIDE}
Ты редактируешь отдельную главу готовой книги перед финальной сборкой.
Тип книги: ${order.bookType.title}
Глава: ${chapter.title}

Текущий текст главы:
${chapterDraft}

Твоя задача:
- оставить только русский язык
- убрать английские слова, иероглифы, битые символы и машинный мусор
- убрать резкие повторы
- сохранить объем главы, не ужимать ее
- сохранить теплоту, мягкость и литературность

Верни только чистовую версию главы без комментариев.`;
}

function buildRegenerateChapterPrompt(order, outline, chapter, relatedQuestions, otherChapters, adminInstruction) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Ты заново пишешь одну главу персональной книги.
Тип книги: ${order.bookType.title}
Название книги: ${outline.title}
Глава: ${chapter.title}
Задача главы: ${chapter.summary}
Целевой формат: ${profile.targetLength}
Объем главы: ${profile.chapterLength}
Факты для использования: ${(chapter.factsToUse || []).join('; ')}

Дополнительная инструкция редактора:
${adminInstruction || 'Сделать главу сильнее, живее и литературнее без противоречий анкете.'}

Уже существующие остальные главы:
${otherChapters.map((item, index) => `${index + 1}. ${item.title}`).join('\n') || 'остальные главы пока не собраны'}

Релевантные ответы анкеты:
${relatedQuestions.map((q) => `${q.number}. ${q.text}\nОтвет: ${q.answer || 'не заполнено'}`).join('\n\n')}

Важно:
- пиши только на русском языке
- не повторяй дословно соседние главы
- глава должна быть заметно полной и развернутой
- не добавляй английские слова, иероглифы, случайные символы и машинный мусор

Верни только готовый текст главы без комментариев.`;
}

function buildMergePrompt(order, outline, chapters) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Собери финальную книгу из готовых глав.
Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}
Название: ${outline.title}
Подзаголовок: ${outline.subtitle || ''}
Идея финального послания: ${outline.finalMessageIdea || ''}
Важно:
- итоговая книга должна быть только на русском языке
- убери все повторы
- убери англоязычные и случайные фрагменты
- сделай текст цельным, чистым и пригодным для печати

Главы:
${chapters.map((chapter, index) => `Глава ${index + 1}: ${chapter.title}\n${chapter.text}`).join('\n\n')}

Верни итоговую книгу в структуре:
Название книги
Подзаголовок
Вступление
Главы
Финальное послание`;
}

function buildEditPrompt(order, draftBook) {
  const profile = getBookProfile(order);
  return `${BOOK_STYLE_GUIDE}
Ты выступаешь как литературный редактор готовой книги.
Тип книги: ${order.bookType.title}
Целевой формат: ${profile.targetLength}

Твоя задача:
- оставить только русский язык
- убрать английские слова, иностранные вставки, битые символы и машинный мусор
- убрать повторы и слишком похожие абзацы
- сделать стиль ровным, теплым и литературным
- сохранить факты, имена, события и общий смысл
- не сокращать книгу слишком сильно
- если видишь длинный хороший фрагмент, лучше мягко вычисти его, чем укорачивай
- сделать текст пригодным для печати

Ниже черновик книги:
${draftBook}

Верни только финальный отредактированный текст книги без комментариев от редактора.`;
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
