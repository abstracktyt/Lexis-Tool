import { useState } from 'react';
import { RuleCategory, Rule } from '../types';
import { ChevronDown, Search } from 'lucide-react';

interface Props {
  categories: RuleCategory[];
  setCategories: (c: RuleCategory[]) => void;
}

export default function RulesParserTab({ categories, setCategories }: Props) {
  const [importMode, setImportMode] = useState<'text' | 'majestic' | 'gta5rp'>('text');
  const [targetCategory, setTargetCategory] = useState<string>(categories.length > 0 ? categories[0].id : '');
  const [inputText, setInputText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [previewRules, setPreviewRules] = useState<Rule[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = () => {
    if (!inputText.trim()) {
      setStatusText('Введите текст для парсинга');
      return;
    }

    const lines = inputText.split('\n');
    const rawRules: string[] = [];
    let currentBlock = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 3) continue;
      
      // Rule starts with numbers like 1.1, 2.3.4, or just a number with a dot. 
      const startsWithNumber = /^(?:\d+\.\d+|\d+\.)/.test(line);
      // Or starts with known rule terms (DM, DB, nonRP, etc.)
      const startsWithTerm = /^(?:DM|DB|Mass\s+DriveBy|nonRP|RK|PG|SK|TK|MG)\b/i.test(line);
      // Or has a punishment pipe at the end and doesn't start with a bullet point
      const hasPunishmentPipe = /^[^●\-\*]/.test(line) && /\|\s*(?:ajail|demorgan|mute|ban|hardban|permban|warn|kick|gunban|изъятие)/i.test(line);
      
      const prevLine = i > 0 ? lines[i-1].trim() : '';
      const isHeaderCandidate = prevLine === '' && line.length < 60 && !/[.:;!?|]$/.test(line) && /^[A-ZА-Я\d]/.test(line);
      
      const isNewRule = (startsWithNumber || startsWithTerm || hasPunishmentPipe || isHeaderCandidate) && !line.startsWith('...');
      
      if (!isNewRule && currentBlock) {
        currentBlock += '\n' + line;
      } else {
        if (currentBlock) rawRules.push(currentBlock);
        currentBlock = line;
      }
    }
    if (currentBlock) rawRules.push(currentBlock);

    const parsed: Rule[] = [];
    let currentChapterNum = '';
    
    rawRules.forEach((content, i) => {
      let punishments: { type: string, duration?: string, unit?: 'мин'|'дн' }[] = [];
      // Look for punishments
      const punishmentRegex = /(?:\||-)?\s*(ajail|demorgan|mute|ban|hardban|permban|warn|kick|gunban)(?:\s*(?:на|от|до)?\s*(\d+(?:[-\s]*(?:до)?\s*\d+)?)\s*(min|мин|минут|минуты|d|д|дн|дней|дня|h|ч|час|часов))?/gi;
      const matches = [...content.matchAll(punishmentRegex)];
      
      for (const match of matches) {
        let pType = 'Demorgan';
        let pDur = '60';
        let pUnit: 'мин' | 'дн' = 'мин';

        const typeRaw = match[1].toLowerCase();
        if (typeRaw === 'ajail' || typeRaw === 'demorgan') pType = 'Demorgan';
        else if (typeRaw === 'mute') pType = 'Mute';
        else if (typeRaw === 'ban') pType = 'Ban';
        else if (typeRaw === 'hardban') pType = 'Hardban';
        else if (typeRaw === 'permban') { pType = 'Permban'; pDur = '9999'; pUnit = 'дн'; }
        else if (typeRaw === 'warn') pType = 'Warn';
        else if (typeRaw === 'kick') pType = 'Kick';
        else if (typeRaw === 'gunban') pType = 'Gunban';
        
        if (match[2]) {
          pDur = match[2].replace(/до/g, '-').replace(/\s+/g, '').trim(); // "60 - до 120" -> "60-120"
        }
        
        if (match[3]) {
          const unitRaw = match[3].toLowerCase();
          if (unitRaw.startsWith('d') || unitRaw.startsWith('д')) {
            pUnit = 'дн';
          }
          else if (unitRaw.startsWith('h') || unitRaw.startsWith('ч')) {
            pUnit = 'мин';
            pDur = pDur.replace(/\d+/g, (m) => (parseInt(m, 10) * 60).toString());
          }
          else {
            pUnit = 'мин';
          }
        } else if (pType === 'Warn' || pType === 'Kick') {
          pDur = '';
        } else if (pType === 'Ban' || pType === 'Hardban') {
          if (!match[2]) pDur = '30';
          pUnit = 'дн';
        }

        punishments.push({ type: pType, duration: pDur, unit: pUnit });
      }

      const primary = punishments.length > 0 ? punishments[0] : { type: '', duration: '', unit: 'мин' as 'мин' | 'дн' };

      // First line without punishment text to generate a clean name
      const firstLine = content.split('\n')[0];
      const cleanFirstLine = firstLine.replace(punishmentRegex, '').trim();
      const words = cleanFirstLine.split(/\s+/);
      let generatedName = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
      let finalContent = content;
      let isDivider = false;

      const chapterMatch = cleanFirstLine.trim().match(/^(\d+)\.\s+([^.|]+?)(?:[\s\u200b]*)$/);
      const isTextHeader = cleanFirstLine.length < 60 && !/[.:;!?|]$/.test(cleanFirstLine.trim()) && /^[A-ZА-Я\d]/.test(cleanFirstLine);

      if (punishments.length === 0 && (chapterMatch || isTextHeader)) {
        isDivider = true;
        if (chapterMatch) {
          currentChapterNum = chapterMatch[1];
        } else {
          currentChapterNum = ''; 
        }
        generatedName = cleanFirstLine.trim();
      } else {
        const numMatch = cleanFirstLine.match(/^(\d+(?:\.\d+)*)\.?\s+/);
        let ruleNum = numMatch ? numMatch[1] : '';

        if (currentChapterNum && ruleNum && !ruleNum.startsWith(currentChapterNum + '.')) {
          ruleNum = `${currentChapterNum}.${ruleNum}`;
          finalContent = `${ruleNum}. ` + content.substring(numMatch![0].length);
        }

        if (ruleNum) {
          generatedName = ruleNum;
        } else {
          generatedName = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
        }
      }

      parsed.push({
        id: Date.now().toString() + i + Math.random().toString().slice(2, 6),
        name: generatedName || `Правило ${i+1}`,
        content: finalContent,
        punishmentType: primary.type,
        duration: primary.duration || '',
        durationUnit: primary.unit,
        punishments,
        severity: 1,
        isPinned: false,
        isDivider
      });
    });

    setPreviewRules(parsed);
    setShowPreview(true);
    setStatusText(`Успешно! Найдено: ${parsed.length} правил.`);
  };

  const applyImport = () => {
    if (previewRules.length === 0) return;

    if (!targetCategory || targetCategory === '') {
      setStatusText('Ошибка: не выбрана сводка для импорта (создайте ее в редакторе)');
      return;
    }

    setCategories(categories.map(c => {
      if (c.id === targetCategory) {
        return { ...c, rules: [...c.rules, ...previewRules] };
      }
      return c;
    }));

    setInputText('');
    setShowPreview(false);
    setPreviewRules([]);
    setStatusText('Импорт завершен успешно!');
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Умный Парсер</h2>
        <p style={{ color: 'var(--text-muted)' }}>Автоматический перенос правил с форумов</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '18px' }}>Импорт правил</h3>
        </div>

        <p style={{ color: 'var(--text-muted)', margin: '0 0 20px 0', fontSize: '13px', lineHeight: 1.5 }}>
          Вставьте текст правил с форума. Нейросеть автоматически распознает статьи и наказания.
        </p>

        {/* Category selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Добавить в:</label>
          <div style={{ position: 'relative', flex: 1 }}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{categories.find(c => c.id === targetCategory)?.name || (categories.length > 0 ? 'Выберите сводку' : 'Нет доступных сводок (создайте в редакторе)')}</span>
              <ChevronDown size={14} style={{ opacity: 0.5 }} />
            </div>

            {isDropdownOpen && (
              <>
                <div onClick={() => setIsDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 11, overflow: 'hidden' }}>
                  {categories.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      Нет сводок
                    </div>
                  )}
                  {categories.map(c => (
                    <div key={c.id} onClick={() => { setTargetCategory(c.id); setIsDropdownOpen(false); }} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', transition: 'background 0.15s' }}>
                      {c.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Вставьте текст правил сюда..."
          style={{ width: '100%', height: '260px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', padding: '15px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '20px', WebkitAppRegion: 'no-drag' as any }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: statusText.includes('Успешно') ? '#10B981' : (statusText.includes('Ошибка') ? '#ef4444' : 'var(--text-muted)') }}>
            {statusText}
          </span>
          <button
            onClick={handleParse}
            style={{ background: 'var(--accent-color)', color: 'var(--accent-text-color)', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Анализировать
          </button>
        </div>
      </div>

      {showPreview && (
        <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Предпросмотр результатов</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowPreview(false); setPreviewRules([]); setStatusText(''); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >Отмена</button>
              <button
                onClick={applyImport}
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >Добавить в профиль</button>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '15px' }}>
            <div style={{ fontWeight: 600, color: '#5865F2', marginBottom: '10px' }}>
              Распознанные правила <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '10px' }}>({previewRules.length} статей)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {previewRules.slice(0, 3).map(rule => (
                <div key={rule.id} style={{ fontSize: '13px' }}>
                  <span style={{ color: '#FFB84D', fontWeight: 600, marginRight: '5px' }}>{rule.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{rule.content.substring(0, 80)}{rule.content.length > 80 ? '...' : ''}</span>
                </div>
              ))}
              {previewRules.length > 3 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>и еще {previewRules.length - 3}...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
