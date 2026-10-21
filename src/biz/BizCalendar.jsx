import { useEffect, useState } from 'react';
import { MAX_CAPACITY, addDays, jstDate, slotLabel, weekday } from '../../lib/domain.js';
import { api } from '../api.js';
import { WEEKDAYS } from '../labels.js';
import { Link } from '../router.jsx';
import { Back, ErrorNote, Spinner, formatDate, useLoad } from '../ui.jsx';

// 日程（カレンダー）：店舗の一覧の「日程（カレンダー）の変更」から開く（/biz/place/:id/calendar）。
// 日ごとの印（〇△✕ー）と予約人数を見て、日をタップすると
//   旅行者に見せる印を選ぶ（自動・〇・△・✕ 受付停止・ー 未定）、時間枠ごとの人数をその日だけ変える、ができる
const MARK = { o: '〇', limited: '△', x: '✕', none: 'ー' };
const SPAN = 35; // 一度に見せる日数（5週）
const CHOICES = [
  { value: 'auto', label: '自動', hint: '空きに合わせて〇△✕を出します' },
  { value: 'o', label: '〇', hint: '空きあり として出します（満席になれば ✕）' },
  { value: 'limited', label: '△', hint: '残りわずか として出します（満席になれば ✕）' },
  { value: 'x', label: '✕', hint: 'この日の受付を止めます' },
  { value: 'none', label: 'ー', hint: 'まだ決まっていない日。旅行者には「ー 未定」と出て、予約できません' },
];

export default function BizCalendar({ id }) {
  return (
    <>
      <Back to="/biz/place" label="店舗一覧" />
      <PlaceCalendar id={id} />
    </>
  );
}

function PlaceCalendar({ id }) {
  const today = jstDate();
  const [offset, setOffset] = useState(0);
  const from = addDays(today, offset);
  const { data, error, loading, reload, setData } = useLoad(() => api.bizCalendar(id, from, SPAN), [id, from]);
  const [selected, setSelected] = useState(null);
  // 開いている日に、まだ「決定」していない変更があるか
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  // 決定していない変更があれば、捨ててよいか聞いてから移る
  const leave = (fn) => {
    if (dirty && !window.confirm('まだ「決定」していない変更があります。変更を取り消して移動しますか？')) return;
    setDirty(false);
    fn();
  };

  if (loading && !data) return <Spinner ja />;
  if (error) return <ErrorNote error={error} ja onRetry={reload} />;

  const { place, days } = data;
  const day = days.find((d) => d.date === selected);
  const replaceDay = (d) => setData({ ...data, days: days.map((x) => (x.date === d.date ? d : x)) });

  return (
    <>
      <h1 style={{ marginBottom: 2 }}>日程（カレンダー）</h1>
      <p className="small" style={{ marginTop: 0 }}>
        店舗：{place.name || '店名未入力'}
      </p>
      {!place.slots.length && (
        <p className="notice">
          時間枠が登録されていないため、予約は受け付けていません。<Link to={`/biz/place/${place.id}`}>店舗の情報</Link>で時間枠を登録してください。
        </p>
      )}
      <p className="muted small">日をタップすると、旅行者に見せる印（〇△✕ー）を選んだり、その日だけ時間枠の人数を変えたりできます。いつもの時間枠・定休日は「店舗情報の変更」で変えられます。</p>
      <div className="cal-nav">
        <button className="btn" disabled={offset === 0} onClick={() => leave(() => (setSelected(null), setOffset(Math.max(0, offset - SPAN))))}>
          ← 前へ
        </button>
        <span className="small muted">
          {formatDate(days[0].date, 'ja')} 〜 {formatDate(days[days.length - 1].date, 'ja')}
        </span>
        <button className="btn" disabled={offset >= 90} onClick={() => leave(() => (setSelected(null), setOffset(offset + SPAN)))}>
          次へ →
        </button>
      </div>
      <div className="calendar biz-cal" aria-label="カレンダー">
        {WEEKDAYS.ja.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {Array.from({ length: weekday(days[0].date) }, (_, i) => (
          <div key={`pad${i}`} />
        ))}
        {days.map((d) => {
          const stop = d.weekly && d.mark === 'x' ? '定休' : null;
          return (
            <button
              key={d.date}
              type="button"
              className={`cal-day mark-${d.mark}${selected === d.date ? ' on' : ''}${stop ? ' stopped' : ''}${d.setting !== 'auto' ? ' manual' : ''}`}
              aria-pressed={selected === d.date}
              aria-label={`${formatDate(d.date, 'ja')} ${stop ?? MARK[d.mark]}${d.setting !== 'auto' ? '（手動）' : ''} 予約${d.people}名${d.changed ? ' 人数を変更中' : ''}`}
              onClick={() => leave(() => setSelected(selected === d.date ? null : d.date))}
            >
              <span className="cal-num">
                {d.date.endsWith('-01') || d === days[0] ? `${Number(d.date.slice(5, 7))}/` : ''}
                {Number(d.date.slice(8))}
              </span>
              <span className="cal-mark">{stop ?? MARK[d.mark]}</span>
              <span className="cal-people">{d.people > 0 ? `${d.people}名` : d.changed ? '変更' : ''}</span>
            </button>
          );
        })}
      </div>
      <p className="small muted cal-legend">〇 空きあり　△ 残りわずか　✕ 予約できない（満席・締切・停止）　ー 未定　「○名」はその日の予約人数。右上に赤い点がある日は、印を手で決めた日です</p>

      {day && <DayEditor key={day.date} placeId={place.id} day={day} onSaved={replaceDay} onDirty={setDirty} onClose={() => leave(() => setSelected(null))} />}

      <RangeStop placeId={place.id} onDone={() => (setDirty(false), setSelected(null), reload())} />
    </>
  );
}

// 1日の調節。印と人数を選んで（下書き）、「決定」で確定する
const SEEN = { auto: '空きに合わせて〇△✕', o: '〇 空きあり（満席なら ✕）', limited: '△ 残りわずか（満席なら ✕）', x: '✕ 受付停止', none: 'ー 未定（予約できません）' };

function DayEditor({ placeId, day, onSaved, onDirty, onClose }) {
  const savedCaps = () => Object.fromEntries(day.slots.map((s) => [s.time, s.capacity]));
  const [mark, setMark] = useState(day.setting);
  const [caps, setCaps] = useState(savedCaps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    document.querySelector('.day-editor')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const markChanged = !day.weekly && mark !== day.setting;
  const capsChanged = day.slots.some((s) => caps[s.time] !== s.capacity);
  const dirty = markChanged || capsChanged;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);

  const decide = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const d = await api.saveDay({
        placeId,
        date: day.date,
        ...(markChanged ? { mark } : {}),
        ...(capsChanged ? { slots: day.slots.map((s) => ({ time: s.time, capacity: caps[s.time] })) } : {}),
      });
      onSaved(d.day);
      setMark(d.day.setting);
      setCaps(Object.fromEntries(d.day.slots.map((s) => [s.time, s.capacity])));
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const undo = () => {
    setMark(day.setting);
    setCaps(savedCaps());
    setError(null);
  };
  const set = (time, v) => {
    setSaved(false);
    setCaps((c) => ({ ...c, [time]: Math.min(MAX_CAPACITY, Math.max(0, v)) }));
  };
  const seen = day.weekly
    ? '✕ 定休日'
    : day.closed
      ? '✕ 受付を止めています'
      : { o: '〇 空きあり', limited: '△ 残りわずか', x: '✕ 予約できません（満席・締切など）', none: 'ー 未定（予約できません）' }[day.mark];

  return (
    <section className={`card day-editor${dirty ? ' dirty' : ''}`} aria-label={`${formatDate(day.date, 'ja')}の調節`}>
      <div className="status-line">
        <h2 style={{ margin: 0, flex: 1 }}>{formatDate(day.date, 'ja')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
      </div>
      <p className="small muted" style={{ margin: '4px 0 10px' }}>
        今の旅行者の画面：{seen}
      </p>

      {day.weekly ? (
        <p className="small">定休日です。定休日を変えるときは「店舗情報の変更」から変更してください。</p>
      ) : (
        <>
          <h3 className="section-title">旅行者に見せる印</h3>
          <div className="mark-choices" role="radiogroup" aria-label="旅行者に見せる印">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={mark === c.value}
                className={`mark-choice m-${c.value}${mark === c.value ? ' on' : ''}`}
                disabled={busy}
                onClick={() => (setSaved(false), setMark(c.value))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>
            {CHOICES.find((c) => c.value === mark)?.hint}
          </p>
        </>
      )}

      {day.slots.length > 0 && (
        <div className="status-line" style={{ marginTop: 12 }}>
          <h3 className="section-title" style={{ margin: 0, flex: 1 }}>
            時間枠ごとの人数（この日だけ）
          </h3>
          <button type="button" className="link small" disabled={busy || day.slots.every((s) => caps[s.time] === s.base)} onClick={() => (setSaved(false), setCaps(Object.fromEntries(day.slots.map((s) => [s.time, s.base]))))}>
            いつもの人数に戻す
          </button>
        </div>
      )}
      {day.slots.map((s) => {
        const cap = caps[s.time];
        return (
          <div key={s.time} className={`slot-adjust${cap === 0 ? ' off' : ''}`}>
            <div className="grow">
              <b>{slotLabel(s)}</b>
              <div className="small muted">
                予約 {s.people}名{s.bookings > 0 && `（${s.bookings}件）`}
                {cap !== s.base && `・いつもは${s.base}名`}
              </div>
              {cap > 0 && cap < s.people && <div className="small warn-text">⚠ 予約済みの人数より少なくなっています（入っている予約はそのままです）</div>}
              {cap === 0 && s.people > 0 && <div className="small warn-text">⚠ 止めても、入っている予約はキャンセルされません</div>}
            </div>
            {cap === 0 ? (
              <button className="btn" onClick={() => set(s.time, s.base)}>
                再開
              </button>
            ) : (
              <div className="stepper" role="group" aria-label={`${slotLabel(s)}の定員`}>
                <button type="button" className="btn" aria-label="1人減らす" onClick={() => set(s.time, cap - 1)}>
                  −
                </button>
                <span aria-live="polite">{cap}名</span>
                <button type="button" className="btn" aria-label="1人増やす" disabled={cap >= MAX_CAPACITY} onClick={() => set(s.time, cap + 1)}>
                  ＋
                </button>
              </div>
            )}
            {cap > 0 && (
              <button type="button" className="link small" onClick={() => set(s.time, 0)}>
                この枠を止める
              </button>
            )}
          </div>
        );
      })}

      <ErrorNote error={error} ja />
      {saved && !dirty && <p className="success small">日程を変更しました。旅行者の画面にすぐ反映されます。</p>}
      {dirty && (
        <div className="decide-bar">
          <p className="small" style={{ margin: '0 0 8px' }}>
            <b>まだ確定していません。</b>
            {markChanged && ` 印：${SEEN[day.setting]} → ${SEEN[mark]}。`}
            {capsChanged && ' 人数を変えました。'}
            「決定」を押すと、旅行者の画面に反映されます。
          </p>
          <div className="btn-row">
            <button className="btn" disabled={busy} onClick={undo}>
              取り消す
            </button>
            <button className="btn primary" disabled={busy} onClick={decide}>
              {busy ? '変更しています…' : '決定'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// 期間をまとめて変える（長いお休み・まだ決まっていない先の予定など）。選んでから「決定」
const RANGE = [
  { value: 'x', label: '✕ 受付を止める' },
  { value: 'none', label: 'ー 未定にする' },
  { value: 'auto', label: '元に戻す（自動）' },
];
function RangeStop({ placeId, onDone }) {
  const today = jstDate();
  const [range, setRange] = useState({ from: '', to: '' });
  const [mark, setMark] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const ready = range.from && range.to && range.to >= range.from && mark;
  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.closures({ placeId, ...range, mark });
      setDone(`${formatDate(range.from, 'ja')} 〜 ${formatDate(range.to, 'ja')} を「${RANGE.find((r) => r.value === mark).label}」に変更しました。`);
      setRange({ from: '', to: '' });
      setMark(null);
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>期間をまとめて変える</h2>
      <p className="small muted">長いお休み（✕）や、まだ日程が決まっていない先の予定（ー）など</p>
      <div className="row">
        <label className="field">
          <span className="field-label">開始日</span>
          <input type="date" min={today} value={range.from} onChange={(e) => (setDone(null), setRange({ ...range, from: e.target.value }))} />
        </label>
        <label className="field">
          <span className="field-label">終了日</span>
          <input type="date" min={range.from || today} value={range.to} onChange={(e) => (setDone(null), setRange({ ...range, to: e.target.value }))} />
        </label>
      </div>
      <div className="chips" role="radiogroup" aria-label="どうするか">
        {RANGE.map((r) => (
          <button key={r.value} type="button" role="radio" aria-checked={mark === r.value} className={mark === r.value ? 'chip on' : 'chip'} onClick={() => (setDone(null), setMark(r.value))}>
            {r.label}
          </button>
        ))}
      </div>
      <ErrorNote error={error} ja />
      {done && <p className="success small">{done}</p>}
      {ready && (
        <p className="small" style={{ marginBottom: 0 }}>
          {formatDate(range.from, 'ja')} 〜 {formatDate(range.to, 'ja')} を「{RANGE.find((r) => r.value === mark).label}」にします。
        </p>
      )}
      <div className="btn-row">
        <button className="btn primary" disabled={busy || !ready} onClick={apply}>
          {busy ? '変更しています…' : '決定'}
        </button>
      </div>
    </div>
  );
}
