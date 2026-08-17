import { useState } from 'react';
import { Copy, Check, Plus, Trash2, Edit2 } from 'lucide-react';
import { QuickCategory, QuickReply } from '../types';

export const DEFAULT_QUICK_CATEGORIES: QuickCategory[] = [
  {
    title: "Обычные быстрые ответы",
    replies: [
      { text: "Здравствуйте, Пожалуйста опишите Ваш вопрос/жалобу более корректно через комманду /report." },
      { text: "Здравствуйте, Исходя из правил сервера, данный репорт является оффтопом." },
      { text: "Здравствуйте, Администрация не телепортирует игроков. Просьба добраться альтернативным способом (пробежаться/доехать)." },
      { text: "Здравствуйте, Администрация не выдает любое имущество игрокам по их просьбе." },
      { text: "Здравствуйте, Если вы не согласны с решением администратора , вы вправе подать жалобу на форум." },
      { text: "Здравствуйте, Данный администратор занят/не в сети, свяжитесь с ним в Discord." },
      { text: "Здравствуйте, Администрация не владеет данной информацией." },
      { text: "Здравствуйте, Свяжитесь с лидером/куратором фракции по поводу увольнения, а если у вас есть VIP статус, то напишите команду /leave" },
      { text: "Здравствуйте, Рюкзак можно приобрести в Палето-Бей в магазине рюкзаков, желтый рюкзак на карте." },
      { text: "Здравствуйте, Лицензию на оружие можно получить в полицейском участке (LSPD) в холле, при себе надо иметь 20.000.000$." },
      { text: "Здравствуйте, Вы должны это узнать путем взаимодействия с другими игроками (RP путем)." },
      { text: "Здравствуйте, Сначала вам надо поставить метку на карте, а потом нажать на клавиатуре клавишу U." },
      { text: "Здравствуйте, Вам надо приехать в больницу, как только вы войдёте в холл, то вам надо повернуть налево пройти до упора, но войти в дверь правее." },
      { text: "Здравствуйте, Вы можете написать команду /famleave (При наличии VIP статуса), а можете связаться с лидером/замом и пропросить вас кикнуть из семьи." },
      { text: "Здравствуйте, Постановка авто на учёт происходит в аэропорту, на карте отображена как оранжевый бейджик." },
      { text: "Здравствуйте, Чтобы получить права вы должны подьехать в автошколу , она находится около Аеропорта LS." },
      { text: "Здравствуйте, Его можно обменять у обменника, обменник это фиолетовый значок слева на карте. Золото можно обменять на: Авто, Оружие, Вирты." },
      { text: "Здравствуйте, Для того чтобы забрать вещи с маркетплейса, вам необходимо подьехать на склад маркетплейса (Зеленый вагончик на карте)." }
    ]
  },
  {
    title: "Репорты по Гос и Крайму",
    replies: [
      { text: "Здравствуйте, Вам необходимо купить на черном рынке ''Отмычка от замка'' и \"Программатор\". Подходите к транспорту который нужно угнать для задания и в инвентаре нажимаете на \"Отмычка от замков\" -> \"Использовать\", открывается дверь авто, далее вам необходимо в инвентаре нажать на предмет \"Программатор\" -> \"Использовать\", у Вас откроется зеленое меню со взломом авто, вам необходимо в ячейке от 1 до 10 вводить только числа из таблицы." },
      { text: "Здравствуйте, AirDrop падает в 4:00 , 8:00 , 12:00 , 16:00 , 20:00 , 00:00." },
      { text: "Здравствуйте, Чтобы открыть AirDrop вам необходимо выпустить в ящик более 150 пуль , после чего нажать английскую букву \"Е\"." },
      { text: "Здравствуйте, Нужно находится в любой фракции Крайм или Гос." }
    ]
  },
  {
    title: "Вопросы по грузоперевозкам",
    replies: [
      { text: "Здравствуйте, Фура не пропадет даже если вас крашнуло." },
      { text: "Здравствуйте, Пригласить может создатель или заместитель компании через меню G." },
      { text: "Здравствуйте, Вам необходимо зайти в личный кабинет и вывести средства нажав на кнопку O." },
      { text: "Здравствуйте, Вам нужно купить ООО чтобы приглашать людей. ИП только на 1 участника." },
      { text: "Здравствуйте, Всего есть 7 фур, 2 в донате, 2 в премиум автосалоне и 2 в люксе и 1 в экономе. Чтобы добавить нужно заспавнить фуру в гараже сделать для нее номера и добавить через кнопку G." },
      { text: "Здравствуйте, В приоритете топа рейтинга кол-во выполненных заказов, т.е. чем больше заказов у компании тем выше она в списке." },
      { text: "Здравствуйте, Компании не слетают, но могут удалиться при условии если, что у компании будут 5/5 предупреждений." },
      { text: "Здравствуйте, Как такого конвоя нет, но на одинаковых фурах и на одинаковых заказах, у вас будут одни и те же маршруты с точками прогрузки и разгрузки." }
    ]
  },
  {
    title: "Вопросы по контейнерам",
    replies: [
      { text: "Здравствуйте, Контейнеры спавнятся в 17:00 , 19:00 , 21:00." }
    ]
  }
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Копировать"
      style={{
        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px', padding: '8px 14px', color: copied ? '#10b981' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
        fontWeight: 600, flexShrink: 0, transition: 'all 0.2s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; } }}
      onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Скопировано!' : 'Копировать'}
    </button>
  );
}

interface Props {
  categories: QuickCategory[];
  updateCategories: (c: QuickCategory[]) => void;
}

export default function QuickRepliesTab({ categories, updateCategories }: Props) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.title)));
  const [activeCategoryTitle, setActiveCategoryTitle] = useState<string | null>(null);

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const [modal, setModal] = useState<{ type: 'prompt' | 'confirm', inputType?: 'text' | 'textarea', title: string, defaultValue?: string, onConfirm: (val: string) => void } | null>(null);

  const handleAddCategory = () => {
    setModal({
      type: 'prompt',
      inputType: 'text',
      title: 'Введите название новой категории:',
      defaultValue: '',
      onConfirm: (title) => {
        if (title && title.trim()) {
          if (categories.some(c => c.title.toLowerCase() === title.trim().toLowerCase())) return;
          const newCat = { title: title.trim(), replies: [] };
          updateCategories([...categories, newCat]);
          setExpandedCategories(prev => new Set(prev).add(newCat.title));
        }
      }
    });
  };

  const handleEditCategory = (oldTitle: string) => {
    setModal({
      type: 'prompt',
      inputType: 'text',
      title: 'Введите новое название категории:',
      defaultValue: oldTitle,
      onConfirm: (title) => {
        if (title && title.trim() && title.trim() !== oldTitle) {
          if (categories.some(c => c.title.toLowerCase() === title.trim().toLowerCase())) return;
          updateCategories(categories.map(c => c.title === oldTitle ? { ...c, title: title.trim() } : c));
          setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(oldTitle)) { next.delete(oldTitle); next.add(title.trim()); }
            return next;
          });
        }
      }
    });
  };

  const handleDeleteCategory = (title: string) => {
    setModal({
      type: 'confirm',
      title: `Вы действительно хотите удалить категорию "${title}" и все ее ответы?`,
      onConfirm: () => {
        updateCategories(categories.filter(c => c.title !== title));
      }
    });
  };

  const handleAddReply = (catTitle: string) => {
    setModal({
      type: 'prompt',
      inputType: 'textarea',
      title: 'Введите новый быстрый ответ:',
      defaultValue: '',
      onConfirm: (text) => {
        if (text && text.trim()) {
          updateCategories(categories.map(c => {
            if (c.title === catTitle) { return { ...c, replies: [...c.replies, { text: text.trim() }] }; }
            return c;
          }));
        }
      }
    });
  };

  const handleEditReply = (catTitle: string, replyIdx: number, oldText: string) => {
    setModal({
      type: 'prompt',
      inputType: 'textarea',
      title: 'Изменить быстрый ответ:',
      defaultValue: oldText,
      onConfirm: (text) => {
        if (text && text.trim() && text.trim() !== oldText) {
          updateCategories(categories.map(c => {
            if (c.title === catTitle) {
              const newReplies = [...c.replies];
              newReplies[replyIdx] = { text: text.trim() };
              return { ...c, replies: newReplies };
            }
            return c;
          }));
        }
      }
    });
  };

  const handleDeleteReply = (catTitle: string, replyIdx: number) => {
    setModal({
      type: 'confirm',
      title: 'Удалить этот быстрый ответ?',
      onConfirm: () => {
        updateCategories(categories.map(c => {
          if (c.title === catTitle) {
            const newReplies = [...c.replies];
            newReplies.splice(replyIdx, 1);
            return { ...c, replies: newReplies };
          }
          return c;
        }));
      }
    });
  };

  const filtered = search.trim()
    ? categories.map(cat => ({
        ...cat,
        replies: cat.replies.filter(r => r.text.toLowerCase().includes(search.toLowerCase()))
      })).filter(cat => cat.replies.length > 0 || cat.title.toLowerCase().includes(search.toLowerCase()))
    : categories;

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Быстрые ответы</h1>
        <button
          onClick={handleAddCategory}
          style={{
            background: 'var(--accent-color)', color: 'var(--accent-text-color)', border: 'none', borderRadius: '8px',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px'
          }}
        >
          <Plus size={16} /> Новая категория
        </button>
      </div>
      
      <div style={{ position: 'relative', marginBottom: '30px' }}>
        <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          placeholder="Поиск по ответам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '12px 16px 12px 42px', color: 'white', fontSize: '14px',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', WebkitAppRegion: 'no-drag' as any
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filtered.map(category => (
          <div key={category.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: expandedCategories.has(category.title) ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: activeCategoryTitle === category.title ? 'rgba(255,255,255,0.03)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseEnter={() => setActiveCategoryTitle(category.title)}
              onMouseLeave={() => setActiveCategoryTitle(null)}
            >
              <div 
                onClick={() => toggleCategory(category.title)}
                style={{ flex: 1, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>{category.title}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
                  {category.replies.length}
                </span>
                <svg
                  style={{ transform: expandedCategories.has(category.title) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.5, marginLeft: '8px' }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div style={{ display: 'flex', gap: '6px', paddingRight: '20px', opacity: activeCategoryTitle === category.title ? 1 : 0, transition: 'opacity 0.2s' }}>
                <button onClick={() => handleEditCategory(category.title)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.5)'} title="Редактировать"><Edit2 size={14} /></button>
                <button onClick={() => handleDeleteCategory(category.title)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.color='#ef4444'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.5)'} title="Удалить"><Trash2 size={14} /></button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateRows: expandedCategories.has(category.title) ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: expandedCategories.has(category.title) ? 1 : 0, transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                  {category.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className="quick-reply-item"
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '14px',
                        transition: 'background 0.15s, border-color 0.15s', position: 'relative'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}
                    >
                      <div style={{ flex: 1, paddingRight: '40px' }}>
                        <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', fontWeight: 400 }}>
                          {reply.text}
                        </p>
                      </div>
                      
                      <div className="reply-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleEditReply(category.title, idx, reply.text)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '8px', borderRadius: '6px' }} onMouseEnter={e => {e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.1)'}} onMouseLeave={e => {e.currentTarget.style.color='rgba(255,255,255,0.6)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'}} title="Редактировать"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteReply(category.title, idx)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '8px', borderRadius: '6px' }} onMouseEnter={e => {e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'}} onMouseLeave={e => {e.currentTarget.style.color='rgba(255,255,255,0.6)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'}} title="Удалить"><Trash2 size={13} /></button>
                        <CopyButton text={reply.text} />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => handleAddReply(category.title)}
                    style={{
                      background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                      padding: '12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', marginTop: '4px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    <Plus size={14} /> Добавить быстрый ответ
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Ничего не найдено</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>Попробуйте другой запрос</div>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '30px', width: '450px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{modal.title}</h2>
            
            {modal.type === 'prompt' && modal.inputType === 'text' && (
              <input 
                type="text"
                autoFocus
                defaultValue={modal.defaultValue}
                id="modal-prompt-input"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    modal.onConfirm((e.currentTarget as HTMLInputElement).value);
                    setModal(null);
                  }
                }}
              />
            )}
            
            {modal.type === 'prompt' && modal.inputType === 'textarea' && (
              <textarea 
                autoFocus
                defaultValue={modal.defaultValue}
                id="modal-prompt-input"
                style={{ width: '100%', height: '120px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    modal.onConfirm((e.currentTarget as HTMLTextAreaElement).value);
                    setModal(null);
                  }
                }}
              />
            )}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Отмена</button>
              <button onClick={() => {
                const val = modal.type === 'prompt' ? (document.getElementById('modal-prompt-input') as HTMLTextAreaElement)?.value : '';
                modal.onConfirm(val);
                setModal(null);
              }} style={{ flex: 1, padding: '12px', background: modal.type === 'confirm' ? '#ef4444' : 'var(--accent-color)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {modal.type === 'confirm' ? 'Удалить' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
