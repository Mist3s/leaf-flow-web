/**
 * Конфигурация категорий для SEO-friendly URL
 * 
 * Маппинг: id категории (из API) <-> slug (для URL) <-> label (для отображения)
 */

export type CategoryConfig = {
  id: string;       // ID из API (используется для фильтрации)
  slug: string;     // URL-friendly slug (используется в /catalog/:slug/)
  label: string;    // Человекочитаемое название
  seo: {
    title: string;
    description: string;
    h1: string;
  };
};

/**
 * Статическая конфигурация категорий
 * Порядок определяет приоритет в sitemap
 */
export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'shu-puer',
    slug: 'shu-puer',
    label: 'Шу Пуэр',
    seo: {
      title: 'Шу Пуэр — Купить китайский чай Шу Пуэр в Калининграде | Zavarka39',
      description: 'Купить настоящий Шу Пуэр (чёрный пуэр) в Калининграде. Выдержанный ферментированный чай из провинции Юньнань. Прямые поставки из Китая, доставка по России.',
      h1: 'Шу Пуэр',
    },
  },
  {
    id: 'sheng-puer',
    slug: 'sheng-puer',
    label: 'Шен Пуэр',
    seo: {
      title: 'Шен Пуэр — Купить китайский чай Шен Пуэр в Калининграде | Zavarka39',
      description: 'Купить настоящий Шен Пуэр (зелёный пуэр) в Калининграде. Живой ферментирующийся чай со старых деревьев Юньнани. Прямые поставки из Китая.',
      h1: 'Шен Пуэр',
    },
  },
  {
    id: 'oolong-tea',
    slug: 'ulun',
    label: 'Улун',
    seo: {
      title: 'Улун — Купить китайский чай Улун (Оолонг) в Калининграде | Zavarka39',
      description: 'Купить улун (оолонг) в Калининграде. Те Гуань Инь, Да Хун Пао, молочный улун и другие. Полуферментированный чай из Фуцзяни и Тайваня.',
      h1: 'Улун (Оолонг)',
    },
  },
  {
    id: 'red-tea',
    slug: 'krasnyj-chaj',
    label: 'Красный (чёрный)',
    seo: {
      title: 'Красный чай — Купить китайский красный чай в Калининграде | Zavarka39',
      description: 'Купить настоящий китайский красный чай в Калининграде. Дянь Хун, Цзинь Цзюнь Мэй и другие сорта. Полностью ферментированный чай с мягким вкусом.',
      h1: 'Красный чай',
    },
  },
  {
    id: 'green-tea',
    slug: 'zelenyj-chaj',
    label: 'Зелёный',
    seo: {
      title: 'Зелёный чай — Купить китайский зелёный чай в Калининграде | Zavarka39',
      description: 'Купить китайский зелёный чай в Калининграде. Лун Цзин, Би Ло Чунь, Маофэн и другие сорта. Неферментированный чай со свежим вкусом.',
      h1: 'Зелёный чай',
    },
  },
  {
    id: 'white-tea',
    slug: 'belyj-chaj',
    label: 'Белый',
    seo: {
      title: 'Белый чай — Купить китайский белый чай в Калининграде | Zavarka39',
      description: 'Купить настоящий белый чай в Калининграде. Бай Хао Инь Чжэнь, Бай Му Дань и другие сорта. Минимальная обработка, нежный вкус и аромат.',
      h1: 'Белый чай',
    },
  },
  {
    id: 'drink-tea',
    slug: 'chajnyj-napitok',
    label: 'Чайный напиток',
    seo: {
      title: 'Чайные напитки — Купить травяные чаи в Калининграде | Zavarka39',
      description: 'Купить чайные напитки и травяные чаи в Калининграде. Гречишный чай, кудин, жасминовый чай и другие напитки для здоровья.',
      h1: 'Чайные напитки',
    },
  },
  {
    id: 'dishes',
    slug: 'posuda',
    label: 'Посуда',
    seo: {
      title: 'Посуда для чайной церемонии — Купить в Калининграде | Zavarka39',
      description: 'Купить посуду для чайной церемонии в Калининграде. Чайники, гайвани, пиалы, чабани и аксессуары. Всё для правильного заваривания чая.',
      h1: 'Посуда для чая',
    },
  },
];

/**
 * Получить категорию по slug (для URL)
 */
export const getCategoryBySlug = (slug: string): CategoryConfig | undefined => {
  return CATEGORIES.find((cat) => cat.slug === slug);
};

/**
 * Получить категорию по id (из API)
 */
export const getCategoryById = (id: string): CategoryConfig | undefined => {
  return CATEGORIES.find((cat) => cat.id === id);
};

/**
 * Получить slug по id категории
 */
export const getSlugById = (id: string): string | undefined => {
  return getCategoryById(id)?.slug;
};

/**
 * Получить id по slug категории
 */
export const getIdBySlug = (slug: string): string | undefined => {
  return getCategoryBySlug(slug)?.id;
};
