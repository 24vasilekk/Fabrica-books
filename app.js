const STORAGE_KEY = 'fabrika-books-webapp-state';
const MAX_PHOTOS = 50;
const MIN_RECOMMENDED_ANSWERED = 30;
const VALID_MANAGER_CODES = ['BOOKS-2026', 'FABRIKA-BOOKS', 'MEMORY-ACCESS'];
let orderPollingTimer = null;
let questionSetsLoaded = typeof window.BOOK_QUESTION_SETS !== 'undefined';
let questionSetsLoadingPromise = null;

const bookTypes = [
  {
    id: 'love',
    title: 'Для любимого человека',
    description: 'Личная история для партнера.'
  },
  {
    id: 'mom',
    title: 'Для мамы',
    description: 'Семейные моменты и важные слова.'
  },
  {
    id: 'dad',
    title: 'Для папы',
    description: 'История про поддержку и семью.'
  },
  {
    id: 'grandma',
    title: 'Для бабушки',
    description: 'Память о семье и традициях.'
  },
  {
    id: 'grandpa',
    title: 'Для дедушки',
    description: 'История о семье и корнях.'
  },
  {
    id: 'child',
    title: 'Для ребенка',
    description: 'История взросления и первых событий.'
  },
  {
    id: 'friend',
    title: 'Для друга или подруги',
    description: 'История дружбы и общих событий.'
  },
  {
    id: 'family',
    title: 'Семейная книга',
    description: 'Семейная хроника по поколениям.'
  }
];

const booksPreview = [
  {
    id: 'book-1',
    title: 'Тихий берег',
    review: 'Спокойная семейная история без спешки.',
    rating: 4.8,
    coverText: 'ТБ'
  },
  {
    id: 'book-2',
    title: 'Наши выходные',
    review: 'Короткие главы о теплых моментах.',
    rating: 4.6,
    coverText: 'НВ'
  },
  {
    id: 'book-3',
    title: 'Письма домой',
    review: 'Личная книга о семье и памяти.',
    rating: 4.9,
    coverText: 'ПД'
  },
  {
    id: 'book-4',
    title: 'Маленькие даты',
    review: 'Истории из повседневной жизни.',
    rating: 4.7,
    coverText: 'МД'
  }
];

const favoriteBooks = [
  {
    id: 'fav-1',
    title: 'Письма домой',
    review: 'Сохранено в избранное.',
    rating: 4.9,
    coverText: 'ПД'
  },
  {
    id: 'fav-2',
    title: 'Наши выходные',
    review: 'Часто открываете этот шаблон.',
    rating: 4.6,
    coverText: 'НВ'
  }
];

const profileItems = [
  { title: 'Заказы', value: '3 активных' },
  { title: 'Черновики', value: '1 сохранен' },
  { title: 'Контакт', value: '@username' }
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
  homeQuickButton: document.getElementById('homeQuickButton'),
  appSections: document.querySelectorAll('.app-section'),
  appSectionButtons: document.querySelectorAll('[data-app-section]'),
  bookList: document.getElementById('bookList'),
  favoritesList: document.getElementById('favoritesList'),
  profileList: document.getElementById('profileList'),
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
  if (appState.selectedBookTypeId && appState.selectedBookTypeId !== 'custom') {
    void ensureQuestionSetsLoaded()
      .then(() => {
        refreshQuestions();
        renderForScreen(appState.activeScreen || 'screen-hero');
      })
      .catch(() => {});
  }
  refreshQuestions();
  renderBookList();
  renderFavoritesList();
  renderProfileList();
  renderBookTypes();
  bindStaticEvents();
  initTouchFeedback();
  restoreInputs();
  setActiveAppSection('section-home');
  showScreen(appState.activeScreen || 'screen-hero', { scroll: false });
}

function renderBookList() {
  if (!els.bookList) return;
  els.bookList.innerHTML = '';

  booksPreview.forEach((book) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'book-list-item';
    item.setAttribute('aria-label', `${book.title}, рейтинг ${book.rating}`);
    item.innerHTML = `
      <span class="book-cover" aria-hidden="true">${book.coverText}</span>
      <span class="book-copy">
        <strong>${book.title}</strong>
        <small>${book.review}</small>
      </span>
      <span class="book-rating" aria-label="Рейтинг">★ ${book.rating.toFixed(1)}</span>
    `;
    els.bookList.appendChild(item);
  });
}

function renderFavoritesList() {
  if (!els.favoritesList) return;
  els.favoritesList.innerHTML = '';

  favoriteBooks.forEach((book) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'book-list-item';
    item.innerHTML = `
      <span class="book-cover" aria-hidden="true">${book.coverText}</span>
      <span class="book-copy">
        <strong>${book.title}</strong>
        <small>${book.review}</small>
      </span>
      <span class="book-rating">★ ${book.rating.toFixed(1)}</span>
    `;
    els.favoritesList.appendChild(item);
  });
}

function renderProfileList() {
  if (!els.profileList) return;
  els.profileList.innerHTML = '';

  profileItems.forEach((itemData) => {
    const item = document.createElement('article');
    item.className = 'book-list-item profile-item';
    item.innerHTML = `
      <span class="book-cover" aria-hidden="true">•</span>
      <span class="book-copy">
        <strong>${itemData.title}</strong>
        <small>${itemData.value}</small>
      </span>
      <span class="book-rating">›</span>
    `;
    els.profileList.appendChild(item);
  });
}

function setActiveAppSection(sectionId) {
  if (!els.appSections.length) return;

  els.appSections.forEach((section) => {
    section.classList.toggle('is-active', section.id === sectionId);
  });

  els.appSectionButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.appSection === sectionId);
  });
}

function initTouchFeedback() {
  const touchSelector = 'button, .upload-card, .choice-item, .checkbox-item';
  let activeElement = null;

  const clearActive = () => {
    if (!activeElement) return;
    activeElement.classList.remove('is-pressed');
    activeElement = null;
  };

  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest(touchSelector);
    if (!target) return;
    clearActive();
    activeElement = target;
    activeElement.classList.add('is-pressed');
  });

  document.addEventListener('pointerup', clearActive);
  document.addEventListener('pointercancel', clearActive);
  document.addEventListener('pointerleave', clearActive);
  document.addEventListener('scroll', clearActive, true);
}

function initTelegram() {
  const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  if (!webApp) {
    applyTelegramTheme({});
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => applyTelegramTheme({});
    if (typeof darkModeMedia.addEventListener === 'function') {
      darkModeMedia.addEventListener('change', handleSystemThemeChange);
    } else if (typeof darkModeMedia.addListener === 'function') {
      darkModeMedia.addListener(handleSystemThemeChange);
    }
    return;
  }

  webApp.ready();
  webApp.expand();
  applyTelegramTheme(webApp.themeParams || {});
  webApp.onEvent('themeChanged', () => applyTelegramTheme(webApp.themeParams || {}));
}

function applyTelegramTheme(theme = {}) {
  const fallback = getDefaultThemeParams();
  const resolvedTheme = {
    bg_color: theme.bg_color || fallback.bg_color,
    text_color: theme.text_color || fallback.text_color,
    hint_color: theme.hint_color || fallback.hint_color,
    link_color: theme.link_color || fallback.link_color,
    button_color: theme.button_color || fallback.button_color,
    button_text_color: theme.button_text_color || fallback.button_text_color,
    secondary_bg_color: theme.secondary_bg_color || fallback.secondary_bg_color,
    header_bg_color: theme.header_bg_color || fallback.header_bg_color,
    accent_text_color: theme.accent_text_color || theme.link_color || fallback.accent_text_color,
    section_bg_color: theme.section_bg_color || fallback.section_bg_color,
    section_header_text_color: theme.section_header_text_color || fallback.section_header_text_color,
    subtitle_text_color: theme.subtitle_text_color || fallback.subtitle_text_color,
    destructive_text_color: theme.destructive_text_color || fallback.destructive_text_color
  };

  const root = document.documentElement;
  const setVar = (name, value) => {
    if (typeof value === 'string' && value.trim()) {
      root.style.setProperty(name, value);
    }
  };

  setVar('--tg-bg-color', resolvedTheme.bg_color);
  setVar('--tg-text-color', resolvedTheme.text_color);
  setVar('--tg-hint-color', resolvedTheme.hint_color);
  setVar('--tg-link-color', resolvedTheme.link_color);
  setVar('--tg-button-color', resolvedTheme.button_color);
  setVar('--tg-button-text-color', resolvedTheme.button_text_color);
  setVar('--tg-secondary-bg-color', resolvedTheme.secondary_bg_color);
  setVar('--tg-header-bg-color', resolvedTheme.header_bg_color);
  setVar('--tg-accent-text-color', resolvedTheme.accent_text_color);
  setVar('--tg-section-bg-color', resolvedTheme.section_bg_color);
  setVar('--tg-section-header-text-color', resolvedTheme.section_header_text_color);
  setVar('--tg-subtitle-text-color', resolvedTheme.subtitle_text_color);
  setVar('--tg-destructive-text-color', resolvedTheme.destructive_text_color);

  const themeColor = resolvedTheme.bg_color;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta && themeColor) {
    themeMeta.setAttribute('content', themeColor);
  }
}

function getDefaultThemeParams() {
  const rootStyles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => rootStyles.getPropertyValue(name).trim() || fallback;

  return {
    bg_color: read('--tg-bg-color', 'Canvas'),
    text_color: read('--tg-text-color', 'CanvasText'),
    hint_color: read('--tg-hint-color', 'GrayText'),
    link_color: read('--tg-link-color', 'LinkText'),
    button_color: read('--tg-button-color', 'AccentColor'),
    button_text_color: read('--tg-button-text-color', 'AccentColorText'),
    secondary_bg_color: read('--tg-secondary-bg-color', 'ButtonFace'),
    header_bg_color: read('--tg-header-bg-color', 'Canvas'),
    accent_text_color: read('--tg-accent-text-color', 'LinkText'),
    section_bg_color: read('--tg-section-bg-color', 'Canvas'),
    section_header_text_color: read('--tg-section-header-text-color', 'GrayText'),
    subtitle_text_color: read('--tg-subtitle-text-color', 'GrayText'),
    destructive_text_color: read('--tg-destructive-text-color', 'Mark')
  };
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function bindStaticEvents() {
  if (els.homeQuickButton) {
    els.homeQuickButton.addEventListener('click', () => {
      setActiveAppSection('section-home');
      showScreen('screen-hero');
    });
  }

  document.querySelectorAll('[data-go-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.goScreen;
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
  els.goToQuestionnaire.addEventListener('click', async () => {
    try {
      await ensureQuestionSetsLoaded();
    } catch (error) {
      // Keep generic questions as fallback if lazy load fails.
    }
    refreshQuestions();
    showScreen('screen-questionnaire');
  });
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

  els.appSectionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveAppSection(button.dataset.appSection);
    });
  });
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
      if (type.id !== 'custom') {
        void ensureQuestionSetsLoaded()
          .then(() => {
            refreshQuestions(true);
            renderForScreen(appState.activeScreen || 'screen-hero');
          })
          .catch(() => {});
      } else {
        refreshQuestions(true);
      }
      persistState();
      renderBookTypes();
      updatePaymentUI();
    });
    els.bookTypeOptions.appendChild(button);
  });
}

async function confirmBookType() {
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
    alert('Выберите, кому книга.');
    return;
  }

  if (appState.selectedBookTypeId && appState.selectedBookTypeId !== 'custom') {
    try {
      await ensureQuestionSetsLoaded();
      refreshQuestions(true);
    } catch (error) {
      // Keep generic questions as fallback if lazy load fails.
      refreshQuestions(true);
    }
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
  updatePaymentUI('Оплата подтверждена. Доступ открыт.');
}

function verifyManagerCode() {
  const code = els.managerCodeInput.value.trim().toUpperCase();
  appState.managerCode = code;

  if (!code) {
    updatePaymentUI('Введите код.');
    persistState();
    return;
  }

  if (VALID_MANAGER_CODES.includes(code)) {
    appState.paymentApproved = true;
    appState.paymentMethod = 'manager-code';
    persistState();
    updatePaymentUI('Код принят. Доступ открыт.');
    return;
  }

  appState.paymentApproved = false;
  appState.paymentMethod = '';
  persistState();
  updatePaymentUI('Код не найден. Проверьте и попробуйте снова.');
}

function updatePaymentUI(message) {
  const selected = appState.selectedBookType || 'Тип книги не выбран';
  const hasContact = appState.customerName.trim() && appState.customerContact.trim();
  els.bookTypeSummary.textContent = `Выбрано: ${selected}`;
  els.goToQuestionnaire.disabled = !appState.paymentApproved || !hasContact;

  if (message) {
    els.paymentStatusText.textContent = message;
  } else if (appState.paymentApproved) {
    els.paymentStatusText.textContent = hasContact
      ? 'Доступ открыт.'
      : 'Укажите имя и контакт.';
  } else {
    els.paymentStatusText.textContent = 'Доступ пока закрыт.';
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
    chapterHint: 'Пишите коротко или подробно, как удобно.',
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
  els.nextQuestionButton.textContent = current === total ? 'Открыть' : 'Далее';
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
      input.placeholder = 'Короткий ответ';
      input.value = typeof answer === 'string' ? answer : '';
      input.addEventListener('input', () => saveAnswer(question.id, input.value));
      return input;
    }
    case 'longText': {
      const textarea = document.createElement('textarea');
      textarea.className = 'input-control';
      textarea.rows = 7;
      textarea.placeholder = 'Введите ответ';
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
    <div class="summary-chip">Всего: ${questions.length}</div>
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
      <button class="ghost-button" type="button">Открыть</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      appState.currentQuestionIndex = index;
      persistState();
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
    alert(`Лимит: ${MAX_PHOTOS} фото.`);
  }

  event.target.value = '';
}

function renderPhotos() {
  els.photoCounter.textContent = `Загружено ${appState.photos.length} / ${MAX_PHOTOS}`;
  els.photoGrid.innerHTML = '';

  if (!appState.photos.length) {
    els.photoGrid.innerHTML = '<div class="empty-state">Фото пока нет.</div>';
    return;
  }

  appState.photos.forEach((photo, index) => {
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="${photo.preview}" alt="${photo.name}" loading="lazy" decoding="async" />
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
  if (!appState.customerName.trim() || !appState.customerContact.trim()) {
    alert('Укажите имя и контакт.');
    showScreen('screen-payment');
    return;
  }

  const answeredCount = questions.filter((question) => isAnswerFilled(appState.answers[question.id])).length;
  if (answeredCount < MIN_RECOMMENDED_ANSWERED) {
    const shouldContinue = window.confirm(
      `Сейчас заполнено только ${answeredCount} ответов из ${questions.length}. Книга может получиться слишком общей. Отправить все равно?`
    );
    if (!shouldContinue) {
      showScreen('screen-review');
      return;
    }
  }

  if (!appState.orderId) {
    appState.orderId = createOrderId();
  }
  appState.submittedAt = new Date().toISOString();
  appState.automationStatus = 'submitting';
  appState.generationStatus = 'Отправляем заказ на сервер.';
  persistState();
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
    appState.generationStatus = result.generationStatus || 'Заказ принят.';
    appState.generatedBook = '';
    appState.managerDeliveryStatus = '';
    persistState();
    renderFinishState();
    startOrderPolling();
  } catch (error) {
    appState.automationStatus = 'error';
    appState.generationStatus = 'Сервер недоступен. Заказ сохранен локально.';
    appState.managerDeliveryStatus = 'Запустите сервер и отправьте заказ снова.';
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
  showScreen('screen-hero', { scroll: false });
}

function renderForScreen(screenId) {
  if (screenId === 'screen-payment') {
    updatePaymentUI();
    return;
  }
  if (screenId === 'screen-questionnaire') {
    renderQuestion();
    return;
  }
  if (screenId === 'screen-review') {
    renderReview();
    return;
  }
  if (screenId === 'screen-photos') {
    renderPhotos();
    return;
  }
  if (screenId === 'screen-finish') {
    renderFinishState();
  }
}

function showScreen(screenId, options = {}) {
  const shouldScroll = options.scroll !== false;
  els.screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.id === screenId);
  });
  renderForScreen(screenId);
  appState.activeScreen = screenId;
  persistState();
  if (shouldScroll) {
    window.scrollTo(0, 0);
  }
}

async function retryGeneration() {
  if (!appState.orderId) return;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(appState.orderId)}/retry`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    appState.automationStatus = 'submitting';
    appState.generationStatus = 'Заказ отправлен повторно.';
    appState.managerDeliveryStatus = '';
    persistState();
    renderFinishState();
    startOrderPolling();
  } catch (error) {
    appState.automationStatus = 'error';
    appState.generationStatus = 'Не удалось запустить повторно.';
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
    els.orderStatusLabel.textContent = 'В обработке';
    els.automationStatusLine.textContent = appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'done-live') {
    els.orderStatusLabel.textContent = 'Готово';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'done-mock') {
    els.orderStatusLabel.textContent = 'Черновик готов';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  if (appState.automationStatus === 'error') {
    els.orderStatusLabel.textContent = 'Ошибка';
    els.automationStatusLine.textContent = appState.managerDeliveryStatus || appState.generationStatus;
    return;
  }

  els.orderStatusLabel.textContent = 'Новый заказ';
  els.automationStatusLine.textContent = 'Заказ принят.';
}

function formatAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.length ? answer.join(', ') : 'Нет ответа';
  }
  if (typeof answer === 'string' && answer.trim()) {
    return answer;
  }
  return 'Нет ответа';
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

function ensureQuestionSetsLoaded() {
  if (questionSetsLoaded) return Promise.resolve();
  if (questionSetsLoadingPromise) return questionSetsLoadingPromise;

  questionSetsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'questionSets.js';
    script.async = true;
    script.onload = () => {
      questionSetsLoaded = true;
      questionSetsLoadingPromise = null;
      resolve();
    };
    script.onerror = () => {
      questionSetsLoadingPromise = null;
      reject(new Error('Failed to load question sets'));
    };
    document.body.appendChild(script);
  });

  return questionSetsLoadingPromise;
}
