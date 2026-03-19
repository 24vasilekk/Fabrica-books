const STORAGE_KEY = 'fabrika-books-webapp-state';
const MAX_PHOTOS = 50;
const VALID_MANAGER_CODES = ['BOOKS-2026', 'FABRIKA-BOOKS', 'MEMORY-ACCESS'];
let orderPollingTimer = null;

const bookTypes = [
  {
    id: 'love',
    title: 'Для любимого человека',
    description: 'История любви, важных дат, слов и воспоминаний, к которым хочется возвращаться.'
  },
  {
    id: 'mom',
    title: 'Для мамы',
    description: 'Теплая книга благодарности, семейных деталей и самых дорогих моментов.'
  },
  {
    id: 'dad',
    title: 'Для папы',
    description: 'Книга про силу, поддержку, характер и личные семейные воспоминания.'
  },
  {
    id: 'grandma',
    title: 'Для бабушки',
    description: 'Теплая книга о семейной памяти, заботе, мудрости и родных традициях.'
  },
  {
    id: 'grandpa',
    title: 'Для дедушки',
    description: 'История про опору, наставничество, семейные корни и важные моменты рядом.'
  },
  {
    id: 'child',
    title: 'Для ребенка',
    description: 'История взросления, нежности, первых шагов и важнейших эпизодов жизни.'
  },
  {
    id: 'friend',
    title: 'Для друга или подруги',
    description: 'Общая история дружбы, смеха, поддержки и моментов, которые невозможно забыть.'
  },
  {
    id: 'family',
    title: 'Семейная книга',
    description: 'Память о поколениях, традициях, поездках, доме и семейном тепле.'
  }
];

const chapters = [
  {
    title: 'Знакомство и контекст',
    hint: 'Вопросы про основу истории, людей, время и тон будущей книги.',
    prompts: [
      'С чего началась эта история?',
      'Каким человеком вы хотите показать главного героя книги?',
      'Какое первое впечатление осталось у вас о нем или о ней?',
      'Какой период жизни особенно важен для этой книги?',
      'Какие три слова лучше всего описывают эту историю?',
      'Какая атмосфера должна чувствоваться с первых страниц?',
      'Что обязательно нужно понять читателю о ваших отношениях?',
      'Какой момент можно считать отправной точкой книги?',
      'Что в этой истории самое настоящее и живое?',
      'Если бы книга начиналась с одной сцены, что это была бы за сцена?',
      'Какие детали сразу делают эту историю узнаваемой?',
      'Почему вы решили создать эту книгу именно сейчас?',
      'Что стало главным поводом для такого подарка?',
      'Какие качества этого человека вам особенно дороги?',
      'Какая общая мечта или цель объединяет вас?',
      'Что хочется сохранить в памяти навсегда?',
      'Какая мысль должна проходить через всю книгу?',
      'Какие события нельзя упускать даже кратко?',
      'Что должно быть сказано мягко и деликатно?',
      'Какой финальный образ вы представляете для этой истории?'
    ]
  },
  {
    title: 'Важные воспоминания',
    hint: 'Здесь собираются события, встречи, поездки и сильные моменты.',
    prompts: [
      'Какой день из вашей истории вспоминается первым?',
      'Какой эпизод был самым радостным?',
      'Какой сложный момент особенно сплотил вас?',
      'Какое совместное путешествие или прогулка особенно запомнились?',
      'Какая дата имеет для вас особенный смысл?',
      'Какой праздник связан с самыми теплыми эмоциями?',
      'Когда вы особенно ярко почувствовали близость?',
      'Какой случай вы до сих пор вспоминаете с улыбкой?',
      'Какой маленький момент оказался очень важным?',
      'Что из прошлого до сих пор согревает вас?',
      'Какая сцена обязательно должна стать отдельной главой?',
      'Какой поворотный момент изменил вашу историю?',
      'Какое место связано с самыми сильными воспоминаниями?',
      'Какой предмет, письмо или вещь символизируют ваши отношения?',
      'Когда вы особенно гордились этим человеком?',
      'Какой разговор повлиял на вас сильнее всего?',
      'Какой день хочется прожить снова?',
      'Какое воспоминание вызывает мурашки даже сейчас?',
      'Какой момент стал символом доверия или любви?',
      'Что было самым нежным в вашей общей истории?'
    ]
  },
  {
    title: 'Чувства и личные смыслы',
    hint: 'Блок про эмоции, внутренние ощущения и то, что сложно сказать вслух.',
    prompts: [
      'За что вы особенно благодарны этому человеку?',
      'Что вы чувствуете рядом с ним или с ней?',
      'Что в этой истории изменило вас?',
      'Какие чувства вам хотелось бы сохранить в книге особенно бережно?',
      'О чем вам важно сказать прямо и честно?',
      'Как этот человек влияет на вашу жизнь?',
      'Что вам хочется, чтобы он или она почувствовали, читая книгу?',
      'Какая фраза могла бы стать сердцем всей истории?',
      'Как вы понимаете любовь, заботу, дружбу или семью в этой книге?',
      'Что вы цените в ваших отношениях больше всего?',
      'Какая поддержка оказалась самой значимой?',
      'Что помогает вам оставаться рядом, несмотря ни на что?',
      'Какая внутренняя сила есть у этого человека?',
      'Что хочется поблагодарить за прошлое?',
      'За что хочется попросить прощения или сказать важные слова?',
      'О чем обычно сложно говорить, но хочется сохранить в книге?',
      'Что делает вашу историю уникальной?',
      'Какой личный смысл вы вкладываете в эту книгу?',
      'Какие слова могли бы согреть через много лет?',
      'Что в этой истории вы считаете самым ценным?'
    ]
  },
  {
    title: 'Детали, символы и атмосфера',
    hint: 'Собираем запахи, звуки, привычки, любимые вещи и маленькие детали.',
    prompts: [
      'Какая музыка ассоциируется с вашей историей?',
      'Какой цвет лучше всего передает настроение книги?',
      'Какие запахи или вкусы связаны с дорогими воспоминаниями?',
      'Какое место можно назвать вашим символическим пространством?',
      'Какая привычка этого человека вызывает у вас нежность?',
      'Какой предмет обязательно должен быть упомянут в книге?',
      'Какие слова или обращения между вами особенно личные?',
      'Какой сезон больше всего похож на вашу историю?',
      'Какая погода, свет или время суток подходят для главной сцены?',
      'Что из повседневных мелочей вам особенно дорого?',
      'Какие семейные или личные традиции нужно сохранить в тексте?',
      'Какой запах дома или любимого места вам вспоминается?',
      'Какая фотография лучше всего передает суть истории?',
      'Какой смех, жест или взгляд невозможно забыть?',
      'Какие книги, фильмы или песни близки этой истории?',
      'Какая еда или напиток вызывают сильные воспоминания?',
      'Какой повторяющийся символ можно провести через всю книгу?',
      'Какую визуальную атмосферу вы представляете на страницах?',
      'Какие детали сделают текст очень личным?',
      'Что из маленького на самом деле значит очень много?'
    ]
  },
  {
    title: 'Послание и финал книги',
    hint: 'Последний блок нужен, чтобы книга завершилась сильным и теплым посланием.',
    prompts: [
      'Какое главное послание вы хотите оставить в конце?',
      'О чем эта книга на самом глубоком уровне?',
      'Что вы хотите пожелать человеку на будущее?',
      'Какие слова поддержки должны прозвучать в финале?',
      'Какой образ можно использовать для красивого завершения?',
      'Что вы хотите напомнить через годы?',
      'Какие мечты важно сохранить в последних главах?',
      'Что вы хотите пообещать этому человеку?',
      'Какое воспоминание лучше оставить последним аккордом?',
      'Какая фраза могла бы стоять на последней странице?',
      'Что для вас значит продолжение этой истории?',
      'Что хочется сказать о будущем мягко и светло?',
      'Какое чувство должно остаться после прочтения?',
      'Что вы надеетесь пережить вместе дальше?',
      'Как вы видите эту историю через 10 лет?',
      'Что будет самым трогательным признанием в финале?',
      'Какую благодарность вы хотите выразить в самом конце?',
      'Почему эта книга останется важной надолго?',
      'Какая мысль должна закрыть историю красиво и честно?',
      'Оставьте несколько теплых слов для финальной страницы.'
    ]
  }
];

const defaultState = {
  activeScreen: 'screen-hero',
  selectedBookTypeId: '',
  selectedBookType: '',
  customBookType: '',
  customerName: '',
  customerContact: '',
  paymentApproved: false,
  paymentMethod: '',
  managerCode: '',
  currentQuestionIndex: 0,
  answers: {},
  photoComment: '',
  photos: [],
  submittedAt: '',
  orderId: '',
  automationStatus: 'idle',
  generationStatus: '',
  generatedBook: '',
  managerDeliveryStatus: ''
};

let appState = loadState();
let questions = getActiveQuestions();

const els = {
  screens: document.querySelectorAll('.screen'),
  bookTypeOptions: document.getElementById('bookTypeOptions'),
  customBookType: document.getElementById('customBookType'),
  confirmBookType: document.getElementById('confirmBookType'),
  bookTypeSummary: document.getElementById('bookTypeSummary'),
  customerNameInput: document.getElementById('customerNameInput'),
  customerContactInput: document.getElementById('customerContactInput'),
  mockPaymentButton: document.getElementById('mockPaymentButton'),
  managerCodeInput: document.getElementById('managerCodeInput'),
  verifyCodeButton: document.getElementById('verifyCodeButton'),
  paymentStatusText: document.getElementById('paymentStatusText'),
  goToQuestionnaire: document.getElementById('goToQuestionnaire'),
  chapterLabel: document.getElementById('chapterLabel'),
  questionLabel: document.getElementById('questionLabel'),
  progressFill: document.getElementById('progressFill'),
  progressNote: document.getElementById('progressNote'),
  questionTheme: document.getElementById('questionTheme'),
  questionText: document.getElementById('questionText'),
  questionHint: document.getElementById('questionHint'),
  questionField: document.getElementById('questionField'),
  prevQuestionButton: document.getElementById('prevQuestionButton'),
  skipQuestionButton: document.getElementById('skipQuestionButton'),
  nextQuestionButton: document.getElementById('nextQuestionButton'),
  reviewStats: document.getElementById('reviewStats'),
  reviewList: document.getElementById('reviewList'),
  backToQuestions: document.getElementById('backToQuestions'),
  photoInput: document.getElementById('photoInput'),
  photoComment: document.getElementById('photoComment'),
  photoCounter: document.getElementById('photoCounter'),
  photoGrid: document.getElementById('photoGrid'),
  submitProjectButton: document.getElementById('submitProjectButton'),
  orderIdLabel: document.getElementById('orderIdLabel'),
  orderStatusLabel: document.getElementById('orderStatusLabel'),
  automationStatusLine: document.getElementById('automationStatusLine'),
  retryGenerationButton: document.getElementById('retryGenerationButton'),
  restartFlowButton: document.getElementById('restartFlowButton')
};

init();

function init() {
  initTelegram();
  if (!appState.selectedBookTypeId && appState.selectedBookType) {
    const matchedType = bookTypes.find((type) => type.title === appState.selectedBookType);
    appState.selectedBookTypeId = matchedType ? matchedType.id : 'custom';
  }
  refreshQuestions();
  renderBookTypes();
  bindStaticEvents();
  restoreInputs();
  updatePaymentUI();
  renderQuestion();
  renderReview();
  renderPhotos();
  renderFinishState();
  showScreen(appState.activeScreen || 'screen-hero');
}

function initTelegram() {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function bindStaticEvents() {
  document.querySelectorAll('[data-go-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.goScreen;
      if (target === 'screen-photos') {
        renderReview();
      }
      showScreen(target);
    });
  });

  document.querySelectorAll('[data-scroll-to]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-action="open-telegram"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink('https://t.me/');
        return;
      }
      window.open('https://t.me/', '_blank');
    });
  });

  els.confirmBookType.addEventListener('click', confirmBookType);
  els.customerNameInput.addEventListener('input', (event) => {
    appState.customerName = event.target.value;
    persistState();
    updatePaymentUI();
  });
  els.customerContactInput.addEventListener('input', (event) => {
    appState.customerContact = event.target.value;
    persistState();
    updatePaymentUI();
  });
  els.mockPaymentButton.addEventListener('click', approvePayment);
  els.verifyCodeButton.addEventListener('click', verifyManagerCode);
  els.goToQuestionnaire.addEventListener('click', () => showScreen('screen-questionnaire'));
  els.prevQuestionButton.addEventListener('click', goToPreviousQuestion);
  els.skipQuestionButton.addEventListener('click', skipQuestion);
  els.nextQuestionButton.addEventListener('click', goToNextQuestion);
  els.backToQuestions.addEventListener('click', () => showScreen('screen-questionnaire'));
  els.photoInput.addEventListener('change', handlePhotoUpload);
  els.photoComment.addEventListener('input', (event) => {
    appState.photoComment = event.target.value;
    persistState();
  });
  els.submitProjectButton.addEventListener('click', submitProject);
  els.retryGenerationButton.addEventListener('click', retryGeneration);
  els.restartFlowButton.addEventListener('click', resetFlow);
}

function restoreInputs() {
  els.customBookType.value = appState.customBookType || '';
  els.customerNameInput.value = appState.customerName || '';
  els.customerContactInput.value = appState.customerContact || '';
  els.managerCodeInput.value = appState.managerCode || '';
  els.photoComment.value = appState.photoComment || '';
}

function renderBookTypes() {
  els.bookTypeOptions.innerHTML = '';

  bookTypes.forEach((type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-card';
    if (appState.selectedBookTypeId === type.id) {
      button.classList.add('selected');
    }
    button.innerHTML = `<strong>${type.title}</strong><small>${type.description}</small>`;
    button.addEventListener('click', () => {
      appState.selectedBookTypeId = type.id;
      appState.selectedBookType = type.title;
      appState.customBookType = '';
      appState.answers = {};
      appState.currentQuestionIndex = 0;
      els.customBookType.value = '';
      refreshQuestions(true);
      persistState();
      renderBookTypes();
      updatePaymentUI();
    });
    els.bookTypeOptions.appendChild(button);
  });
}

function confirmBookType() {
  const customValue = els.customBookType.value.trim();
  if (customValue) {
    appState.selectedBookTypeId = 'custom';
    appState.selectedBookType = customValue;
    appState.customBookType = customValue;
    appState.answers = {};
    appState.currentQuestionIndex = 0;
    refreshQuestions(true);
  }

  if (!appState.selectedBookType) {
    alert('Сначала выберите, для кого создается книга.');
    return;
  }

  persistState();
  updatePaymentUI();
  showScreen('screen-payment');
}

function approvePayment() {
  appState.paymentApproved = true;
  appState.paymentMethod = 'mock-online';
  appState.managerCode = '';
  els.managerCodeInput.value = '';
  persistState();
  updatePaymentUI('Тестовая оплата подтверждена. Реального списания нет, доступ к анкете открыт.');
}

function verifyManagerCode() {
  const code = els.managerCodeInput.value.trim().toUpperCase();
  appState.managerCode = code;

  if (!code) {
    updatePaymentUI('Введите код доступа от менеджера.');
    persistState();
    return;
  }

  if (VALID_MANAGER_CODES.includes(code)) {
    appState.paymentApproved = true;
    appState.paymentMethod = 'manager-code';
    persistState();
    updatePaymentUI('Код подтвержден. Доступ к анкете открыт.');
    return;
  }

  appState.paymentApproved = false;
  appState.paymentMethod = '';
  persistState();
  updatePaymentUI('Код не найден. Проверьте его или свяжитесь с менеджером.');
}

function updatePaymentUI(message) {
  const selected = appState.selectedBookType || 'Тип книги пока не выбран';
  const hasContact = appState.customerName.trim() && appState.customerContact.trim();
  els.bookTypeSummary.textContent = `Выбрано: ${selected}`;
  els.goToQuestionnaire.disabled = !appState.paymentApproved || !hasContact;

  if (message) {
    els.paymentStatusText.textContent = message;
  } else if (appState.paymentApproved) {
    els.paymentStatusText.textContent = hasContact
      ? 'Доступ к анкете открыт.'
      : 'Оплата подтверждена, но сначала укажите имя и контакт клиента.';
  } else {
    els.paymentStatusText.textContent = 'Доступ к анкете пока закрыт.';
  }
}

function buildGenericQuestions() {
  const questionTypePattern = ['longText', 'shortText', 'singleChoice', 'multiChoice', 'date'];
  const singleChoices = ['Очень важно', 'Скорее важно', 'Можно кратко', 'Необязательно'];
  const multiChoices = ['Тепло', 'Нежность', 'Юмор', 'Гордость', 'Благодарность', 'Ностальгия'];

  return chapters.flatMap((chapter, chapterIndex) =>
    chapter.prompts.map((prompt, promptIndex) => {
      const type = questionTypePattern[promptIndex % questionTypePattern.length];
      return {
        id: `q-${chapterIndex + 1}-${promptIndex + 1}`,
        chapterIndex,
        chapterTitle: chapter.title,
        chapterHint: chapter.hint,
        chapterNumber: chapterIndex + 1,
        totalChapters: chapters.length,
        questionNumber: chapterIndex * 20 + promptIndex + 1,
        text: prompt,
        type,
        options: type === 'singleChoice' ? singleChoices : type === 'multiChoice' ? multiChoices : []
      };
    })
  );
}

function getSelectedQuestionSetKey() {
  if (appState.selectedBookTypeId && window.BOOK_QUESTION_SETS?.[appState.selectedBookTypeId]) {
    return appState.selectedBookTypeId;
  }
  return '';
}

function buildQuestionsFromSource(sourceQuestions) {
  const chapterTitles = [...new Set(sourceQuestions.map((item) => item.chapter || 'Без главы'))];

  return sourceQuestions.map((item, index) => ({
    id: `book-${getSelectedQuestionSetKey() || 'custom'}-${index + 1}`,
    chapterIndex: chapterTitles.indexOf(item.chapter || 'Без главы'),
    chapterTitle: item.chapter || 'Без главы',
    chapterHint: 'Ответьте свободно и подробно. Именно из этих ответов будет собираться текст книги.',
    chapterNumber: chapterTitles.indexOf(item.chapter || 'Без главы') + 1,
    totalChapters: chapterTitles.length,
    questionNumber: index + 1,
    text: item.text,
    type: 'longText',
    options: []
  }));
}

function getActiveQuestions() {
  const selectedKey = getSelectedQuestionSetKey();
  if (selectedKey) {
    return buildQuestionsFromSource(window.BOOK_QUESTION_SETS[selectedKey]);
  }
  return buildGenericQuestions();
}

function refreshQuestions(resetIndex = false) {
  questions = getActiveQuestions();
  if (resetIndex || appState.currentQuestionIndex >= questions.length) {
    appState.currentQuestionIndex = 0;
  }
}

function renderQuestion() {
  const question = questions[appState.currentQuestionIndex] || questions[0];
  const current = question.questionNumber;
  const total = questions.length;
  const answer = appState.answers[question.id];

  els.chapterLabel.textContent = `Глава ${question.chapterNumber}/${question.totalChapters}`;
  els.questionLabel.textContent = `Вопрос ${current}/${total}`;
  els.progressFill.style.width = `${(current / total) * 100}%`;
  els.progressNote.textContent = `Пройдено ${current} из ${total} вопросов`;
  els.questionTheme.textContent = question.chapterTitle;
  els.questionText.textContent = question.text;
  els.questionHint.textContent = question.chapterHint;
  els.prevQuestionButton.disabled = appState.currentQuestionIndex === 0;
  els.nextQuestionButton.textContent = current === total ? 'Перейти к обзору' : 'Далее';
  els.questionField.innerHTML = '';

  const field = buildField(question, answer);
  els.questionField.appendChild(field);
}

function buildField(question, answer) {
  switch (question.type) {
    case 'shortText': {
      const input = document.createElement('input');
      input.className = 'input-control';
      input.type = 'text';
      input.placeholder = 'Введите короткий ответ';
      input.value = typeof answer === 'string' ? answer : '';
      input.addEventListener('input', () => saveAnswer(question.id, input.value));
      return input;
    }
    case 'longText': {
      const textarea = document.createElement('textarea');
      textarea.className = 'input-control';
      textarea.rows = 7;
      textarea.placeholder = 'Расскажите свободно и так, как чувствуете';
      textarea.value = typeof answer === 'string' ? answer : '';
      textarea.addEventListener('input', () => saveAnswer(question.id, textarea.value));
      return textarea;
    }
    case 'date': {
      const input = document.createElement('input');
      input.className = 'input-control';
      input.type = 'date';
      input.value = typeof answer === 'string' ? answer : '';
      input.addEventListener('input', () => saveAnswer(question.id, input.value));
      return input;
    }
    case 'singleChoice': {
      const wrap = document.createElement('div');
      wrap.className = 'choice-group';
      question.options.forEach((option) => {
        const label = document.createElement('label');
        label.className = 'choice-item';
        label.innerHTML = `
          <input type="radio" name="${question.id}" value="${option}" ${answer === option ? 'checked' : ''} />
          <span>${option}</span>
        `;
        label.querySelector('input').addEventListener('change', (event) => saveAnswer(question.id, event.target.value));
        wrap.appendChild(label);
      });
      return wrap;
    }
    case 'multiChoice': {
      const wrap = document.createElement('div');
      wrap.className = 'checkbox-group';
      const selected = Array.isArray(answer) ? answer : [];
      question.options.forEach((option) => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        label.innerHTML = `
          <input type="checkbox" value="${option}" ${selected.includes(option) ? 'checked' : ''} />
          <span>${option}</span>
        `;
        label.querySelector('input').addEventListener('change', () => {
          const next = Array.from(wrap.querySelectorAll('input:checked')).map((input) => input.value);
          saveAnswer(question.id, next);
        });
        wrap.appendChild(label);
      });
      return wrap;
    }
    default:
      return document.createElement('div');
  }
}

function saveAnswer(questionId, value) {
  appState.answers[questionId] = value;
  persistState();
}

function goToPreviousQuestion() {
  if (appState.currentQuestionIndex > 0) {
    appState.currentQuestionIndex -= 1;
    persistState();
    renderQuestion();
  }
}

function skipQuestion() {
  const question = questions[appState.currentQuestionIndex];
  saveAnswer(question.id, '');
  goToNextQuestion();
}

function goToNextQuestion() {
  if (appState.currentQuestionIndex >= questions.length - 1) {
    renderReview();
    showScreen('screen-review');
    return;
  }

  appState.currentQuestionIndex += 1;
  persistState();
  renderQuestion();
}

function renderReview() {
  const filledCount = questions.filter((question) => isAnswerFilled(appState.answers[question.id])).length;
  const skippedCount = questions.length - filledCount;

  els.reviewStats.innerHTML = `
    <div class="summary-chip">Заполнено: ${filledCount}</div>
    <div class="summary-chip">Пропущено: ${skippedCount}</div>
    <div class="summary-chip">Всего вопросов: ${questions.length}</div>
  `;

  els.reviewList.innerHTML = '';

  questions.forEach((question, index) => {
    const answer = appState.answers[question.id];
    const item = document.createElement('article');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-meta">
        <span class="status-pill">${question.chapterTitle}</span>
        <span class="status-pill ${isAnswerFilled(answer) ? 'filled' : 'empty'}">${isAnswerFilled(answer) ? 'Заполнено' : 'Пропущено'}</span>
      </div>
      <strong>${question.questionNumber}. ${question.text}</strong>
      <p>${formatAnswer(answer)}</p>
      <button class="ghost-button" type="button">Изменить ответ</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      appState.currentQuestionIndex = index;
      persistState();
      renderQuestion();
      showScreen('screen-questionnaire');
    });
    els.reviewList.appendChild(item);
  });
}

function handlePhotoUpload(event) {
  const incomingFiles = Array.from(event.target.files || []);
  if (!incomingFiles.length) return;

  const freeSlots = MAX_PHOTOS - appState.photos.length;
  const acceptedFiles = incomingFiles.slice(0, freeSlots);

  acceptedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      appState.photos.push({
        id: `${Date.now()}-${index}`,
        name: file.name,
        preview: reader.result
      });
      persistState();
      renderPhotos();
    };
    reader.readAsDataURL(file);
  });

  if (incomingFiles.length > freeSlots) {
    alert(`Можно загрузить не более ${MAX_PHOTOS} фотографий.`);
  }

  event.target.value = '';
}

function renderPhotos() {
  els.photoCounter.textContent = `Загружено ${appState.photos.length} / ${MAX_PHOTOS}`;
  els.photoGrid.innerHTML = '';

  if (!appState.photos.length) {
    els.photoGrid.innerHTML = '<div class="empty-state">Пока нет загруженных фотографий.</div>';
    return;
  }

  appState.photos.forEach((photo, index) => {
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="${photo.preview}" alt="${photo.name}" />
      <div class="photo-card-footer">
        <span>${index + 1}. ${truncate(photo.name, 16)}</span>
        <div>
          <button class="icon-button" type="button" data-move="up">↑</button>
          <button class="icon-button" type="button" data-move="down">↓</button>
          <button class="icon-button" type="button" data-remove>×</button>
        </div>
      </div>
    `;
    card.querySelector('[data-remove]').addEventListener('click', () => {
      appState.photos = appState.photos.filter((item) => item.id !== photo.id);
      persistState();
      renderPhotos();
    });
    card.querySelector('[data-move="up"]').addEventListener('click', () => movePhoto(index, -1));
    card.querySelector('[data-move="down"]').addEventListener('click', () => movePhoto(index, 1));
    els.photoGrid.appendChild(card);
  });
}

function movePhoto(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= appState.photos.length) return;
  const items = [...appState.photos];
  const [item] = items.splice(index, 1);
  items.splice(nextIndex, 0, item);
  appState.photos = items;
  persistState();
  renderPhotos();
}

async function submitProject() {
  if (!appState.photos.length) {
    alert('Добавьте хотя бы одну фотографию, чтобы завершить проект.');
    return;
  }

  if (!appState.customerName.trim() || !appState.customerContact.trim()) {
    alert('Укажите имя и контакт клиента перед отправкой.');
    showScreen('screen-payment');
    return;
  }

  if (!appState.orderId) {
    appState.orderId = createOrderId();
  }
  appState.submittedAt = new Date().toISOString();
  appState.automationStatus = 'submitting';
  appState.generationStatus = 'Заказ отправляется на сервер и ставится в очередь на генерацию книги.';
  persistState();
  renderFinishState();
  showScreen('screen-finish');

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildOrderPayload())
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    appState.orderId = result.orderId || appState.orderId;
    appState.automationStatus = 'submitting';
    appState.generationStatus = result.generationStatus || 'Заказ принят сервером и поставлен в очередь.';
    appState.generatedBook = '';
    appState.managerDeliveryStatus = '';
    persistState();
    renderFinishState();
    startOrderPolling();
  } catch (error) {
    appState.automationStatus = 'error';
    appState.generationStatus = 'Backend пока не отвечает. Заказ сохранен только в браузере.';
    appState.managerDeliveryStatus = 'Поднимите сервер и повторите отправку для генерации книги и уведомления менеджера.';
    persistState();
    renderFinishState();
  }
}

function resetFlow() {
  stopOrderPolling();
  appState = cloneDefaultState();
  refreshQuestions(true);
  persistState();
  restoreInputs();
  renderBookTypes();
  updatePaymentUI();
  renderQuestion();
  renderReview();
  renderPhotos();
  showScreen('screen-hero');
}

function showScreen(screenId) {
  els.screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.id === screenId);
  });
  appState.activeScreen = screenId;
  persistState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function retryGeneration() {
  if (!appState.orderId) return;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(appState.orderId)}/retry`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    appState.automationStatus = 'submitting';
    appState.generationStatus = 'Заказ повторно поставлен в очередь.';
    appState.managerDeliveryStatus = '';
    persistState();
    renderFinishState();
    startOrderPolling();
  } catch (error) {
    appState.automationStatus = 'error';
    appState.generationStatus = 'Не удалось повторно запустить генерацию.';
    persistState();
    renderFinishState();
  }
}

function startOrderPolling() {
  stopOrderPolling();
  if (!appState.orderId) return;
  pollOrderStatus();
  orderPollingTimer = setInterval(pollOrderStatus, 4000);
}

function stopOrderPolling() {
  if (orderPollingTimer) {
    clearInterval(orderPollingTimer);
    orderPollingTimer = null;
  }
}

async function pollOrderStatus() {
  if (!appState.orderId) return;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(appState.orderId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const order = await response.json();
    appState.generationStatus = order.generationStatus || appState.generationStatus;
    appState.managerDeliveryStatus = order.managerDeliveryStatus || '';
    appState.generatedBook = order.generatedBook || '';

    if (order.status === 'sent_to_manager') {
      appState.automationStatus = order.mode === 'live' ? 'done-live' : 'done-mock';
      persistState();
      renderFinishState();
      stopOrderPolling();
      return;
    }

    if (order.status === 'generated' || order.status === 'mock-generated') {
      appState.automationStatus = order.mode === 'live' ? 'done-live' : 'done-mock';
      persistState();
      renderFinishState();
      return;
    }

    if (order.status === 'error') {
      appState.automationStatus = 'error';
      persistState();
      renderFinishState();
      stopOrderPolling();
      return;
    }

    appState.automationStatus = 'submitting';
    persistState();
    renderFinishState();
  } catch (error) {
    // Keep silent during polling; finish screen already shows pending state.
  }
}

function buildOrderPayload() {
  return {
    orderId: appState.orderId,
    submittedAt: appState.submittedAt,
    customer: {
      name: appState.customerName.trim(),
      contact: appState.customerContact.trim()
    },
    bookType: {
      id: appState.selectedBookTypeId || 'custom',
      title: appState.selectedBookType
    },
    payment: {
      approved: appState.paymentApproved,
      method: appState.paymentMethod,
      managerCode: appState.managerCode
    },
    questionnaire: {
      totalQuestions: questions.length,
      questions: questions.map((question) => ({
        id: question.id,
        number: question.questionNumber,
        chapter: question.chapterTitle,
        text: question.text,
        answer: appState.answers[question.id] || ''
      }))
    },
    photos: appState.photos,
    photoComment: appState.photoComment || ''
  };
}

function renderFinishState() {
  els.orderIdLabel.textContent = appState.orderId || 'FB-BOOKS-0001';
  els.retryGenerationButton.disabled = !appState.orderId;

  if (appState.automationStatus === 'submitting') {
    els.orderStatusLabel.textContent = 'Отправляем в AI';
    els.automationStatusLine.textContent = appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'done-live') {
    els.orderStatusLabel.textContent = 'Готово и отправлено';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'done-mock') {
    els.orderStatusLabel.textContent = 'Mock-генерация готова';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'error') {
    els.orderStatusLabel.textContent = 'Нужен backend';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  els.orderStatusLabel.textContent = 'Новый заказ';
  els.automationStatusLine.textContent = 'Заказ пока обработан в локальном mock-режиме.';
}

function formatAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.length ? answer.join(', ') : 'Ответ пока не заполнен';
  }
  if (typeof answer === 'string' && answer.trim()) {
    return answer;
  }
  return 'Ответ пока не заполнен';
}

function isAnswerFilled(answer) {
  if (Array.isArray(answer)) return answer.length > 0;
  return typeof answer === 'string' ? answer.trim().length > 0 : false;
}

function createOrderId() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `FB-BOOKS-${yyyy}${mm}${dd}-${suffix}`;
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();
    return { ...cloneDefaultState(), ...JSON.parse(raw) };
  } catch (error) {
    return cloneDefaultState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}
