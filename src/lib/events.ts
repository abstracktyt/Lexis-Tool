export interface EventLocation {
  id: string;
  name: string;
  coords?: string;
}

export interface EventTemplate {
  id: string;
  name: string;
  sponsor: boolean;
}

export interface CommandItem {
  cmd: string;
  desc: string;
}

export interface CommandGroup {
  title: string;
  hint?: string;
  commands: CommandItem[];
}

export const DEFAULT_LOCATIONS: EventLocation[] = [
  { id: 'loc-1', name: 'Главная площадь', coords: '' },
  { id: 'loc-2', name: 'Пляж Лос-Сантоса', coords: '' },
  { id: 'loc-3', name: 'Городской стадион', coords: '' },
  { id: 'loc-4', name: 'Аэропорт', coords: '' },
];

export const DEFAULT_TEMPLATES: EventTemplate[] = [
  { id: 'ev-1', name: 'Дерби', sponsor: false },
  { id: 'ev-2', name: 'Гонки', sponsor: false },
  { id: 'ev-3', name: 'UFC', sponsor: false },
  { id: 'ev-4', name: 'Прятки', sponsor: false },
  { id: 'ev-5', name: 'Русская рулетка', sponsor: false },
  { id: 'ev-6', name: 'Догони админа', sponsor: true },
  { id: 'ev-7', name: 'Маньяк', sponsor: true },
  { id: 'ev-8', name: 'Модный приговор', sponsor: true },
];

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    title: 'Спонсорство',
    commands: [
      { cmd: '/global Уважаемые игроки, если вы желаете стать спонсором мероприятия, напишите в репорт "мп+".', desc: 'Анонс набора спонсора' },
    ],
  },
  {
    title: 'Анонс (за 10–20 минут)',
    commands: [
      { cmd: '/global Уважаемые игроки, в 18:35 пройдёт мероприятие "Название МП". Приз: ?.', desc: 'Первый анонс мероприятия' },
      { cmd: '/global Уважаемые игроки, сейчас проходит мероприятие "Название МП". Приз: ?. Для участия — /event', desc: 'Анонс запуска (повторный при мало участников)' },
    ],
  },
  {
    title: 'Основные команды',
    commands: [
      { cmd: '/createevent 99 0 Название МП', desc: 'Создать МП (99 — лимит участников | 0 — радиус)' },
      { cmd: '/startevent', desc: 'Запустить МП' },
      { cmd: '/global [MP]: Начали!', desc: 'Оповещение о старте' },
      { cmd: '/stopevent ID 50000000', desc: 'Завершить МП' },
      { cmd: '/mpveh id 1 1 кол-во', desc: 'Заспавнить транспорт на МП' },
      { cmd: '/eventhp кол-во', desc: 'Выдать ХП участникам МП' },
      { cmd: '/kickevent id', desc: 'Кикнуть игрока с МП' },
    ],
  },
];

export function uid() {
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function copyText(text: string) {
  if (window.ipcRenderer) window.ipcRenderer.send('copy-to-clipboard', text);
  else navigator.clipboard.writeText(text).catch(() => {});
}