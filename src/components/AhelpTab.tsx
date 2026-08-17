import { useState } from 'react';
import { Search } from 'lucide-react';
import HighlightText from './HighlightText';

const AHELP_DATA = [
  {
    level: "Уровень 1",
    role: "@Junior Administrator",
    commands: [
      { cmd: "a", desc: "адм чат" },
      { cmd: "admins", desc: "Список админов онлайн" },
      { cmd: "asms [id]", desc: "СМС игроку" },
      { cmd: "az", desc: "Админ зона" },
      { cmd: "demorgan [id] [time] [reason]", desc: "Деморган" },
      { cmd: "gethere [id]", desc: "Телепортировать игрока с авто к себе" },
      { cmd: "getcar [carid]", desc: "Телепортировать ТС к себе" },
      { cmd: "gm", desc: "Бессмертие" },
      { cmd: "goto [id]", desc: "Телепортироваться к игроку с авто" },
      { cmd: "hp [id] [hp]", desc: "Установить хп игроку" },
      { cmd: "id [nick]", desc: "Проверить ник по [id]" },
      { cmd: "metp [id]", desc: "Телепортировать игрока к себе" },
      { cmd: "mute [id] [time] [reason]", desc: "Замутить игрока" },
      { cmd: "pcid [staticid]", desc: "Узнать инфу о игроке по статику" },
      { cmd: "ptime [id]", desc: "Узнать причину и время деморгана игрока [C кпз так-же]" },
      { cmd: "repair", desc: "Починить ТС" },
      { cmd: "rescar [carid]", desc: "Заспавнить авто" },
      { cmd: "setdim [id] [demenshion]", desc: "Сменить дименшн игрока" },
      { cmd: "setvehdim", desc: "Сменить дименшн машины" },
      { cmd: "spec [id]", desc: "Следить за игроком" },
      { cmd: "specoff", desc: "Выйти из слежки" },
      { cmd: "tp [id]", desc: "Телепортироваться к игроку" },
      { cmd: "udemorgan [id] [true/если false то ничего писать не надо]", desc: "Выпустить из деморгана" },
      { cmd: "unmute [id]", desc: "Размутить игрока" },
      { cmd: "leaders", desc: "Посмотреть какие лидеры онлайн" },
      { cmd: "tpatm", desc: "Телепортироваться к банкомату по айдишнику" },
      { cmd: "gs [id]", desc: "Статик, Имя, Айди игрока" },
      { cmd: "aeject [id]", desc: "Вытащить игрока из машины" },
      { cmd: "sendmark [id]", desc: "Администратор ставит метку на своей карте и вводит команду > Игрок получает метку от Администратора" },
      { cmd: "timestamp", desc: "Включить / Выключить время в чате у себя (для игроков тоже работает)" },
      { cmd: "checkpunish", desc: "Проверить логи наказаний" },
      { cmd: "delveh [carid]", desc: "Реснуть машину" },
      { cmd: "rescue id", desc: "поднять игрока" }
    ]
  },
  {
    level: "Уровень 2",
    role: "@Junior Administrator",
    commands: [
      { cmd: "checkmoney [id]", desc: "Проверить деньги" },
      { cmd: "checkdim [id]", desc: "Проверить дименшн" },
      { cmd: "hide", desc: "Стать прозрачным" },
      { cmd: "tpped [id]", desc: "ТП на НПС" },
      { cmd: "kick [id] [reason]", desc: "Кикнуть" },
      { cmd: "kill [id]", desc: "Убить" },
      { cmd: "offjail [id] [time] [reason]", desc: "Посадить в деморган в оффлайне" },
      { cmd: "unjail [id]", desc: "Вытащить из деморгана в оффлайне" },
      { cmd: "checkprop id", desc: "Проверить имущество" },
      { cmd: "checkpropstatic [staticId]", desc: "Проверить имущество" },
      { cmd: "puuid [Пасспорт]", desc: "Поиск игрока по паспорту" },
      { cmd: "gunban", desc: "Выдать запрет на оружия [В часах]" },
      { cmd: "ungunban", desc: "Снять запрет на оружия [В часах]" },
      { cmd: "showpveh [staticId]", desc: "Вывести модель, ID машин игрока" }
    ]
  },
  {
    level: "Уровень 3",
    role: "@Junior Administrator",
    commands: [
      { cmd: "chide", desc: "Инвиз от читеров" },
      { cmd: "eventhp", desc: "Установить ХП на МП" },
      { cmd: "eventkick", desc: "Кикнуть с МП" },
      { cmd: "getcarme", desc: "Телепортироваться к ТС" },
      { cmd: "global", desc: "Глобал чат" },
      { cmd: "mpveh", desc: "Создать МП ТС" },
      { cmd: "plveh", desc: "Создать админ авто" },
      { cmd: "delacar", desc: "Удалить админ авто" },
      { cmd: "createevent", desc: "Создать МП" },
      { cmd: "startevent", desc: "Запустить МП" },
      { cmd: "stopevent", desc: "Закончить МП" },
      { cmd: "mpveh > Название авто", desc: "заспаунить авто на мп" },
      { cmd: "eventhp", desc: "Выдать ХП участникам МП" },
      { cmd: "eventar", desc: "Выдать броню участникам МП" },
      { cmd: "eventkick", desc: "Кикнуть с МП" },
      { cmd: "tpbiz", desc: "Телепортироваться к Бизнесу" },
      { cmd: "tphouse", desc: "Телепортироваться к Дому" },
      { cmd: "warn", desc: "Выдать варн" },
      { cmd: "unwarn", desc: "Снять варн" },
      { cmd: "veh", desc: "Создать авто возле себя" },
      { cmd: "plveh", desc: "Создать авто [Вы будете сразу в ТС]" },
      { cmd: "tpc", desc: "тп по кордам" },
      { cmd: "delvehr", desc: "удаление транспорта по радиусу" }
    ]
  },
  {
    level: "Уровень 4",
    role: "@Administrator",
    commands: [
      { cmd: "changename", desc: "Сменить ник" },
      { cmd: "afuel", desc: "Заправить авто" },
      { cmd: "ainfect", desc: "Вылечить от болезни" },
      { cmd: "ban", desc: "Забанить" },
      { cmd: "templeader", desc: "Поставить себя на временного лидера фракции" },
      { cmd: "delfrac", desc: "Кикнуть игрока из фракции [Через id]" },
      { cmd: "offdelfrac", desc: "Снять лидера [Через #Статик]" },
      { cmd: "fz", desc: "Заморозить" },
      { cmd: "unfz", desc: "Разморозить" },
      { cmd: "givelic", desc: "Выдать лицензия" },
      { cmd: "hardban", desc: "Выдать хард бан" },
      { cmd: "offban", desc: "Выдать оффлайн бан" },
      { cmd: "offhardban", desc: "Выдать оффлайн хардбан" },
      { cmd: "offmute", desc: "Выдать мут в оффлайне" },
      { cmd: "offwarn", desc: "Выдать варн в оффлайне" },
      { cmd: "pname", desc: "Узнать статик по нику" },
      { cmd: "unban", desc: "Разбанить" },
      { cmd: "unhardban", desc: "Снять хард-бан" },
      { cmd: "tpcapturezone", desc: "[id] Тп на территории гетто [каптов]" },
      { cmd: "sendcreator", desc: "[id] - Сменить внешность" },
      { cmd: "spawncars [fractionID]", desc: "Заспавнить все фракционные машины в которых никто не сидит" },
      { cmd: "takelic [playerID] [licID]", desc: "Забрать лицензию у игрока" },
      { cmd: "avehr radius", desc: "Завести весь транспорт в радиусе" },
      { cmd: "delacars", desc: "Удалить все админ авто на сервере" },
      { cmd: "checkinv id", desc: "Чекнуть инвентарь" },
      { cmd: "offcheckinv static", desc: "Чекнуть инвентарь оффлайн" },
      { cmd: "offchangename id", desc: "Cменить ник игроку оффлайн" },
      { cmd: "c", desc: "Посмотреть свои координаты" }
    ]
  },
  {
    level: "Уровень 5",
    role: "@Head Spectator",
    commands: [
      { cmd: "changestock", desc: "Изменить склад фракции" },
      { cmd: "familyinfo", desc: "[id фамы] Посмотреть информацию о фамки" },
      { cmd: "setleader id id frac", desc: "Выдать лиду игроку" },
      { cmd: "offdelfrac", desc: "Снять лидера [Через #Статик]" },
      { cmd: "delleader", desc: "Снять лидера [Через id]" },
      { cmd: "offsetleader [staticId] [fractionId]", desc: "Поставить лидера оффлайн [Через #Статик]" },
      { cmd: "offdelleader [staticId]", desc: "Снять лидера оффлайн [Через #Статик]" },
      { cmd: "setmedia [id]", desc: "Добавить игроку цвет медиа" },
      { cmd: "delmedia [id]", desc: "Удалить цвет медиа" },
      { cmd: "createfamtp [name] [playersLimit] [radius]", desc: "Создать телепорт для семьи" },
      { cmd: "stopfamtp", desc: "Удалить телепорт" },
      { cmd: "famtp [name]", desc: "Телепортироваться к созданному телепорту" }
    ]
  },
  {
    level: "Уровень 6",
    role: "@Senior Administrator",
    commands: [
      { cmd: "clearconviction [id]", desc: "Снять судимость" },
      { cmd: "changeadname", desc: "Сделать ник без фамилии" },
      { cmd: "afuninvite [PlayerID]", desc: "Выгнать игрока из семьи" },
      { cmd: "setadminrank [id]", desc: "Изменить уровень админ" },
      { cmd: "offsetadminrank [id]", desc: "Изменить уровень админ оффлайн" },
      { cmd: "setadmin [id]", desc: "Поставить на админку" },
      { cmd: "deladmin [id]", desc: "Снять с админки" },
      { cmd: "offdeladmin [static]", desc: "Снять админа оффлайн" }
    ]
  }
];

const FACTIONS = [
  { id: 1, name: "Families", color: "#16a34a" },
  { id: 2, name: "Ballas", color: "#9333ea" },
  { id: 3, name: "Vagos", color: "#eab308" },
  { id: 4, name: "Marabunta", color: "#3b82f6" },
  { id: 5, name: "Bloods", color: "#dc2626" },
  { id: 6, name: "Government", color: "#475569" },
  { id: 7, name: "LSPD", color: "#2563eb" },
  { id: 8, name: "EMS", color: "#ef4444" },
  { id: 9, name: "FBI", color: "#1e3a8a" },
  { id: 11, name: "RM", color: "#b91c1c" },
  { id: 12, name: "MM", color: "#0d9488" },
  { id: 13, name: "LCN", color: "#ea580c" },
  { id: 14, name: "Sang", color: "#65a30d" },
  { id: 15, name: "WN", color: "#f97316" }
];

export default function AhelpTab({ userLevel = 8, userRole = 'Администратор' }: { userLevel?: number, userRole?: string }) {
  const [search, setSearch] = useState('');

  // Only show commands for the user's level or lower
  const availableData = AHELP_DATA.filter((_, idx) => (idx + 1) <= userLevel);

  const filteredData = availableData.map(group => {
    return {
      ...group,
      commands: group.commands.filter(c => 
        c.cmd.toLowerCase().includes(search.toLowerCase()) || 
        c.desc.toLowerCase().includes(search.toLowerCase())
      )
    }
  }).filter(group => group.commands.length > 0);

  return (
    <div style={{ padding: '30px', display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
      
      {/* Commands List */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Команды Администратора</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Доступные команды для уровня: <strong style={{color: 'var(--accent-color)'}}>{userLevel} ({userRole})</strong>
            </p>
          </div>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Поиск команды..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '8px 12px 8px 36px', color: '#fff', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredData.map((group, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--accent-color)' }}>{group.level}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>{group.role}</span>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {group.commands.map((cmd, j) => (
                  <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: '6px', userSelect: 'text' }}>
                    <div style={{ fontFamily: 'monospace', color: '#fff', fontSize: '13px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                      /<HighlightText text={cmd.cmd} query={search} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      <HighlightText text={cmd.desc} query={search} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Ничего не найдено
            </div>
          )}
        </div>
      </div>

      {/* Factions Sidebar */}
      <div style={{ width: '280px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', position: 'sticky', top: '30px', maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600, flexShrink: 0 }}>ID Фракций</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
          {FACTIONS.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.color }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{f.name}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {f.id}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
