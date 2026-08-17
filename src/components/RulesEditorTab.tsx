import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Bookmark, Folder, FolderOpen } from 'lucide-react';
import { Rule, RuleCategory } from '../types';

interface Props {
  categories: RuleCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RuleCategory[]>>;
}

const PUNISHMENTS = [
  'Demorgan',
  'Mute',
  'Ban',
  'Hardban',
  'Warn',
  'Kick',
  'Gunban'
];

function CustomSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        {value}
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
            background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            zIndex: 11, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
          }}>
            {options.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                style={{
                  padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                  background: value === opt ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: 'white'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = value === opt ? 'rgba(255,255,255,0.1)' : 'transparent'}
              >
                {opt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RulesEditorTab({ categories, setCategories }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories.length > 0 ? categories[0].id : null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, catId: string } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (activeCategoryId === null && categories.length > 0) setActiveCategoryId(categories[0].id);
  else if (activeCategoryId && categories.length > 0 && !categories.find(c => c.id === activeCategoryId)) setActiveCategoryId(categories[0].id);

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  const addCategory = () => {
    const newId = Date.now().toString();
    const newCat: RuleCategory = { id: newId, name: 'Новая сводка', rules: [] };
    setCategories((prev: any) => [...prev, newCat]);
    setActiveCategoryId(newId);
    setRenameModal({ id: newId, name: '' });
  };

  const addRule = () => {
    if (!activeCategoryId) return;
    const newRule: Rule = {
      id: Date.now().toString(),
      name: 'Новое правило', content: 'Описание правила...', punishmentType: 'Demorgan',
      duration: '60', durationUnit: 'мин', severity: 1, isPinned: false
    };
    setCategories(prev => prev.map(c => c.id === activeCategoryId ? { ...c, rules: [newRule, ...(c.rules || [])] } : c));
  };

  const addDivider = () => {
    if (!activeCategoryId) return;
    const newRule: Rule = {
      id: Date.now().toString(),
      name: 'Глава I', content: '', punishmentType: 'Demorgan',
      duration: '60', durationUnit: 'мин', severity: 1, isPinned: false, isDivider: true
    };
    setCategories(prev => prev.map(c => c.id === activeCategoryId ? { ...c, rules: [newRule, ...(c.rules || [])] } : c));
  };


  const updateRule = (ruleId: string, updates: Partial<Rule>) => {
    if (!activeCategoryId) return;
    setCategories(prev => prev.map(c => c.id !== activeCategoryId ? c : { ...c, rules: (c.rules || []).map(r => r.id === ruleId ? { ...r, ...updates } : r) }));
  };

  const deleteRule = (ruleId: string) => {
    if (!activeCategoryId) return;
    setCategories(prev => prev.map(c => c.id !== activeCategoryId ? c : { ...c, rules: (c.rules || []).filter(r => r.id !== ruleId) }));
  };

  const [renameModal, setRenameModal] = useState<{ id: string, name: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const updateCategoryName = (id: string, newName: string) => {
    if (newName && newName.trim()) {
      setCategories((prev: RuleCategory[]) => prev.map(c => c.id === id ? { ...c, name: newName.trim() } : c));
    }
  };

  const renameCategoryPrompt = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    setRenameModal({ id, name: cat.name });
    setContextMenu(null);
  };

  const deleteCategoryPrompt = (id: string) => {
    setDeleteModal(id);
    setContextMenu(null);
  };

  const confirmDeleteCategory = () => {
    if (deleteModal) {
      setCategories(categories.filter(c => c.id !== deleteModal));
      if (activeCategoryId === deleteModal) setActiveCategoryId(categories.length > 1 ? categories.find(c => c.id !== deleteModal)!.id : null);
      setDeleteModal(null);
    }
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div style={{ padding: '30px' }}>

      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Правила</h2>
        <p style={{ color: 'var(--text-muted)' }}>Центральная база правил</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Редактор</h3>
      </div>

      {/* Category Tabs (Pills) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
        {categories.map(cat => {
          const isActive = activeCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, catId: cat.id }); }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: isActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              {isActive ? <FolderOpen size={14} /> : <Folder size={14} />}
              {cat.name}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={addCategory}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          <Plus size={14} /> Сводка
        </button>
        <button
          onClick={addDivider}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          <Plus size={14} /> Разделитель (Глава)
        </button>
        <button
          onClick={addRule}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          <Plus size={14} /> Правило
        </button>
      </div>

      {/* Rules List Container */}
      {activeCategory && (
        <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Раздел: {activeCategory.name}</div>
          <button
            onClick={() => setCollapsedCategories(prev => ({ ...prev, [activeCategory.id]: !prev[activeCategory.id] }))}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            {collapsedCategories[activeCategory.id] ? 'Открыть раздел' : 'Скрыть раздел'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeCategory?.rules.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Нет правил в этой категории.</div>
        ) : !activeCategory || collapsedCategories[activeCategory.id] ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 12px' }}>Раздел скрыт.</div>
        ) : (
          activeCategory?.rules.map((rule, ruleIndex) => {
            // A collapsed chapter hides its following rules, up to the next chapter.
            const precedingChapter = activeCategory.rules.slice(0, ruleIndex).reverse().find(item => item.isDivider);
            if (!rule.isDivider && precedingChapter?.isCollapsed) return null;

            return (
            rule.isDivider ? (
              <div key={rule.id} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', position: 'relative', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ color: '#ea580c', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Глава / Разделитель</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => updateRule(rule.id, { isCollapsed: !rule.isCollapsed })}
                      title={rule.isCollapsed ? 'Раскрыть главу' : 'Скрыть главу'}
                      style={{ background: 'rgba(234,88,12,0.12)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', cursor: 'pointer' }}
                    >
                      {rule.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <input
                  value={rule.name}
                  onChange={e => updateRule(rule.id, { name: e.target.value })}
                  placeholder="Название главы"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-main)', padding: '4px 0' }}
                />
              </div>
            ) : (
              <div key={rule.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <input
                    value={rule.name}
                    onChange={e => updateRule(rule.id, { name: e.target.value })}
                    placeholder="Название/Пункт"
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none', fontFamily: 'var(--font-main)', padding: '4px 0', marginRight: '16px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => updateRule(rule.id, { isPinned: !rule.isPinned })} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: rule.isPinned ? 'var(--accent-color)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      <Bookmark size={14} fill={rule.isPinned ? 'var(--accent-color)' : 'none'} />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={rule.content}
                  onChange={e => {
                    updateRule(rule.id, { content: e.target.value });
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  placeholder="Описание..."
                  style={{ width: '100%', minHeight: '40px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '16px', lineHeight: '1.5', overflow: 'hidden', fontFamily: 'var(--font-main)' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {(rule.punishments ? rule.punishments : [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }]).map((p, pIndex) => (
                    <div key={pIndex} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: '180px' }}>
                        <CustomSelect
                          value={p.type}
                        onChange={(val) => {
                          let currentPuns = rule.punishments || [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }];
                          currentPuns = [...currentPuns];
                          currentPuns[pIndex] = { ...currentPuns[pIndex], type: val };
                          const updates: any = { punishments: currentPuns };
                          if (pIndex === 0) updates.punishmentType = val;
                          updateRule(rule.id, updates);
                        }}
                        options={PUNISHMENTS}
                      />
                    </div>
                    <input
                      type="text"
                      value={p.duration || ''}
                      onChange={e => {
                        let currentPuns = rule.punishments || [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }];
                        currentPuns = [...currentPuns];
                        currentPuns[pIndex] = { ...currentPuns[pIndex], duration: e.target.value };
                        const updates: any = { punishments: currentPuns };
                        if (pIndex === 0) updates.duration = e.target.value;
                        updateRule(rule.id, updates);
                      }}
                      placeholder="Время (напр. 30 или 3-7)"
                      style={{ width: '140px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                    <div style={{ width: '80px' }}>
                      <CustomSelect
                        value={p.unit || 'мин'}
                        onChange={(val) => {
                          let currentPuns = rule.punishments || [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }];
                          currentPuns = [...currentPuns];
                          currentPuns[pIndex] = { ...currentPuns[pIndex], unit: val as 'мин'|'дн' };
                          const updates: any = { punishments: currentPuns };
                          if (pIndex === 0) updates.durationUnit = val;
                          updateRule(rule.id, updates);
                        }}
                        options={['мин', 'дн']}
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                         let currentPuns = [...(rule.punishments || [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }])];
                         currentPuns.splice(pIndex, 1);
                         
                         const updates: any = { punishments: currentPuns };
                         if (currentPuns.length > 0) {
                           updates.punishmentType = currentPuns[0].type;
                           updates.duration = currentPuns[0].duration;
                           updates.durationUnit = currentPuns[0].unit;
                         } else {
                           updates.punishmentType = 'None';
                           updates.duration = '';
                           updates.durationUnit = 'мин';
                         }
                         updateRule(rule.id, updates);
                      }}
                      style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    let currentPuns = rule.punishments || [{ type: rule.punishmentType, duration: rule.duration, unit: rule.durationUnit }];
                    currentPuns = [...currentPuns, { type: 'Demorgan', duration: '60', unit: 'мин' }];
                    updateRule(rule.id, { punishments: currentPuns });
                  }}
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  <Plus size={12} /> Добавить вариант наказания
                </button>
              </div>
            </div>
            )
            );
          })
        )}
      </div>

      {/* Context Menu for Categories */}
      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
          background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)', minWidth: '150px', padding: '4px'
        }}>
          <div
            onClick={() => renameCategoryPrompt(contextMenu.catId)}
            style={{ padding: '8px 12px', fontSize: '13px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          ><Edit2 size={14} /> Переименовать</div>
          <div
            onClick={() => deleteCategoryPrompt(contextMenu.catId)}
            style={{ padding: '8px 12px', fontSize: '13px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          ><Trash2 size={14} /> Удалить</div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '340px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: 'white' }}>Удалить сводку?</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Вы уверены, что хотите удалить эту сводку и все её правила? Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteCategory}
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Category Modal */}
      {renameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitAppRegion: 'no-drag' as any }}>
          <div style={{ background: '#1c1c1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', width: '300px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Переименовать сводку</h3>
            <input
              type="text"
              value={renameModal.name}
              onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateCategoryName(renameModal.id, renameModal.name);
                  setRenameModal(null);
                }
              }}
              autoFocus
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '20px', WebkitAppRegion: 'no-drag' as any }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRenameModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px' }}
              >Отмена</button>
              <button
                onClick={() => {
                  updateCategoryName(renameModal.id, renameModal.name);
                  setRenameModal(null);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#5b7c9e', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
