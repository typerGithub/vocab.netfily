import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import './win11.css';

// --- CSV header normalization & aliases ---
const normalize = (s: string) =>
  s ? s.toLowerCase().replace(/^[\uFEFF]+/, '').trim() : '';

const HEADER_ALIASES: Record<string, keyof Row> = {
  'word': 'Word', 'en': 'Word', 'english': 'Word',
  'слово': 'Word', 'английское слово': 'Word', 'англійське слово': 'Word',
  'translation': 'Translation', 'translate': 'Translation',
  'ua': 'Translation', 'ukrainian': 'Translation',
  'перевод': 'Translation', 'переклад': 'Translation',
  'transcription': 'Transcription', 'ipa': 'Transcription',
  'транскрипция': 'Transcription', 'транскрипція': 'Transcription',
  'unit': 'Unit', 'юнит': 'Unit', 'розділ': 'Unit', 'раздел': 'Unit',
  'topic': 'Topic', 'тема': 'Topic',
  'form': 'Form', 'форма': 'Form', 'pos': 'Form', 'part of speech': 'Form'
};

type Row = {
  Word: string;
  Transcription?: string;
  Translation: string;
  Unit?: string | number;
  Topic?: string;
  Form?: string | number;
};

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('All');
  const [topic, setTopic] = useState('All');
  const [form, setForm] = useState('All');

  // ====== Голоса ======
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
  const all = window.speechSynthesis.getVoices();
  const ua = navigator.userAgent;
  let preferred: string[] = [];

  if (/Chrome/.test(ua) && /Win/.test(ua)) {
    preferred = ['Google US English', 'Microsoft Zira'];
  } else if (/Chrome/.test(ua) && /Mac/.test(ua)) {
    preferred = ['Google UK English Female', 'Google UK English Male'];
  } else if (/Safari/.test(ua) && /Mac/.test(ua)) {
    preferred = ['Samantha', 'Daniel'];
  } else if (/Edg/.test(ua) && /Win/.test(ua)) {
    preferred = ['Microsoft Zira', 'Microsoft Hazel'];
  }

  let found = all.filter(v => preferred.includes(v.name));

  // --- Fallback для Safari (если голосов нет) ---
  if (found.length === 0 && /Safari/.test(ua) && /Mac/.test(ua)) {
    const fakeVoice = {
      voiceURI: 'Samantha',
      name: 'Samantha (fallback)',
      lang: 'en-US',
      localService: true,
      default: true
    } as SpeechSynthesisVoice;
    found = [fakeVoice];
  }

  setVoices(found);
  setVoice(found[0] || null);
};

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speak = (text: string) => {
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // ====== Загрузка CSV ======
  Papa.parse<Row>('/english_school.csv', {
  download: true,
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: (header: string) => {
    const n = normalize(header);
    return HEADER_ALIASES[n] ?? header.trim();
  },
  complete: (res: ParseResult<Row>) => {   // <--- вот тут
    const data = res.data.map((raw) => {
      const r = Object.create(null) as Row;
      if (raw.Word) r.Word = String(raw.Word).trim();
      if (raw.Translation) r.Translation = String(raw.Translation).trim();
      if (raw.Transcription) r.Transcription = String(raw.Transcription).trim();
      if (raw.Unit) r.Unit = String(raw.Unit).trim();
      if (raw.Topic) r.Topic = String(raw.Topic).trim();
      if (raw.Form) r.Form = String(raw.Form).trim();
      return r;
    }).filter(r => r.Word || r.Translation);

    setRows(data);
  }
});

  // ====== Фильтры ======
  const units = useMemo(() => ['All', ...unique(rows.map(r => r.Unit ?? ''))], [rows]);
  const topics = useMemo(() => ['All', ...unique(rows.map(r => r.Topic ?? ''))], [rows]);
  const forms = useMemo(() => ['All', ...unique(rows.map(r => r.Form ?? ''))], [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter(r => {
      const byUnit = unit === 'All' || (r.Unit ?? '').toString() === unit;
      const byTopic = topic === 'All' || (r.Topic ?? '').toString() === topic;
      const byForm = form === 'All' || (r.Form ?? '').toString() === form;

      const hay = [
        r.Word, r.Translation, r.Transcription,
        r.Topic?.toString(), r.Unit?.toString(), r.Form?.toString()
      ].filter(Boolean).join(' ').toLowerCase();

      const bySearch = ql === '' || hay.includes(ql);
      return byUnit && byTopic && byForm && bySearch;
    });
  }, [rows, q, unit, topic, form]);

  // ====== Пагинация ======
  const PAGE_SIZE = 70;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(filtered.length, page * PAGE_SIZE);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => { setPage(1); }, [q, unit, topic, form]);

  // ====== UI ======
  return (
    <div className="container">
      <h1>ENGLISH - UKRAINIAN DICTIONARY</h1>

      {/* Поиск */}
      <div className="search-row">
        <input
          id="searchInput"
          type="search"
          placeholder="word / translation / [tran]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="search-btn" type="button">🔍</button>
      </div>

      {/* Фильтры */}
      <div className="filters-grid">
        <div className="filter-item">
          <label htmlFor="unit">Unit</label>
          <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map(u => <option key={String(u)} value={String(u)}>{String(u) || '(empty)'}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="topic">Topic</label>
          <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map(t => <option key={String(t)} value={String(t)}>{String(t) || '(empty)'}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="form">Grade</label>
          <select id="form" value={form} onChange={(e) => setForm(e.target.value)}>
            {forms.map(f => <option key={String(f)} value={String(f)}>{String(f) || '(empty)'}</option>)}
          </select>
        </div>

        {/* Выбор голоса */}
        <div className="filter-item">
          <label htmlFor="voice">Voice</label>
          <select
            id="voice"
            value={voice?.name || ""}
            onChange={(e) => {
              const v = voices.find(v => v.name === e.target.value) || null;
              setVoice(v);
            }}
          >
            {voices.map(v => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Таблица */}
      <div className="table-wrapper">
        <table className="dictionary-table">
          <thead>
            <tr>
              <th>SPEAK</th>
              <th>WORD</th>
              <th>TRANSCRIPTION</th>
              <th>TRANSLATION</th>
              <th>UNIT</th>
              <th>TOPIC</th>
              <th>GRADE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={7}>No results</td>
              </tr>
            ) : (
              paginated.map((r, i) => (
                <tr key={i}>
                  <td>
                    <button className="speak-btn" onClick={() => speak(r.Word)}>🔊</button>
                  </td>
                  <td>{r.Word}</td>
                  <td>{r.Transcription}</td>
                  <td>{r.Translation}</td>
                  <td>{r.Unit}</td>
                  <td>{r.Topic}</td>
                  <td>{r.Form}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Пагинация */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
          <button onClick={() => setPage(1)} disabled={page <= 1}>« First</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
          <span>Page {page} / {totalPages} &nbsp;•&nbsp; {startIdx}-{endIdx} of {filtered.length}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</button>
        </div>
      </div>
    </div>
  );
}

function unique(arr: any[]) {
  const vals = Array.from(new Set(arr.map(v => (v ?? '').toString().trim()))).filter(v => v !== '');
  return vals.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}