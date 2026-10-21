import { useEffect, useState } from 'react';
import {
  CATEGORIES, DIET_SUPPORT, FOUNDED_MIN, GENRES, MAX_MENU, PAYMENT_METHODS, yearsOpen, jstDate, LOCAL_PCTS, MAX_CAPACITY, MAX_DESCRIPTION, MAX_PHOTOS, MAX_SLOTS, MENU_STYLES, PAYMENTS, PETS, PRICE_BANDS, REQUIRED, SMOKING, YEARS,
  missingFields,
} from '../../lib/domain.js';
import { prefOf } from '../../lib/japan.js';
import JapanPicker, { useCity } from '../components/JapanPicker.jsx';
import { api } from '../api.js';
import { PinPicker } from '../components/Maps.jsx';
import { WEEKDAYS, bandText, options } from '../labels.js';
import { shrinkImage } from '../photos.js';
import { navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { Back, Chips, ErrorNote, Spinner, useLoad } from '../ui.jsx';

const EMPTY_ITEM = { name: '', price: '', note: '', photo: null };
const EMPTY = {
  category: null, genre: null, menu: [], prefCode: null, cityId: null, name: '', address: '', station: '', lat: null, lng: null, description: '', price: '', priceBand: null, durationMin: '', payments: [], link: '',
  localPct: null, foundedYear: '', stationKm: '', smoking: null, pets: null, privateRoom: null,
  photos: [], popular: EMPTY_ITEM, ownerPick: EMPTY_ITEM, kodawari: '', kodawariPhoto: null, perk: '',
  belongings: '', minPeople: '', dietSupport: [], menuStyle: null,
  slots: [], closedWeekdays: [], leadDays: 1, publish: true,
};
const LEAD = [
  { value: 0, label: '当日OK' },
  { value: 1, label: '前日まで' },
  { value: 2, label: '2日前まで' },
];
const blank = (v) => (v == null ? '' : v);
const itemForm = (v) => (v?.name ? { name: v.name, price: blank(v.price), note: v.note ?? '', photo: v.photo ?? null } : EMPTY_ITEM);

const toForm = (p) =>
  p
    ? {
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
        price: blank(p.price),
        durationMin: blank(p.durationMin),
        foundedYear: blank(p.foundedYear),
        payments: p.payments ?? [],
        stationKm: blank(p.stationKm),
        minPeople: blank(p.minPeople),
        link: p.link ?? '',
        menu: (p.menu ?? []).map((m) => ({ name: m.name ?? '', price: blank(m.price), amount: m.amount ?? '', note: m.note ?? '' })),
        popular: itemForm(p.popular),
        ownerPick: itemForm(p.ownerPick),
        publish: p.published || !p.publishedAt, // 事業者が自分で非公開にしていなければ公開
      }
    : EMPTY;

const thisYear = Number(jstDate().slice(0, 4));
const itemBody = (v) => (v.name.trim() ? { ...v, price: v.price === '' ? null : Number(v.price) } : null);

// 店舗の情報（id があればその店舗を直す。なければ新しい店舗を作る）
export default function PlaceEditor({ id }) {
  const { data, error, loading, reload, setData } = useLoad(() => (id ? api.bizPlace(id) : Promise.resolve({ place: null })), [id]);
  const { refresh } = useSession();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const city = useCity(form.cityId);

  useEffect(() => {
    if (data) setForm(toForm(data.place));
  }, [data]);

  if (loading && !data) return <Spinner ja />;
  if (error) return <ErrorNote error={error} ja onRetry={reload} />;

  const place = data.place;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const num = (v) => (v === '' ? null : v);
  const missing = missingFields({ ...form, price: num(form.price), durationMin: num(form.durationMin), stationKm: num(form.stationKm), foundedYear: num(form.foundedYear) });

  // 新しい店舗で、何も入れていないまま「保存する」を押したときは送らない（押すたびに空の下書きが増えないように）
  const untouched = !place && JSON.stringify({ ...form, publish: EMPTY.publish, leadDays: EMPTY.leadDays }) === JSON.stringify(EMPTY);

  const save = async (e) => {
    e.preventDefault();
    if (untouched) {
      setSaveError(new Error('まだ何も入力されていません。店名などを入力してから保存してください。'));
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      const d = await api.savePlace({
        ...form,
        slots: form.slots.map((s) => ({ time: s.time, end: s.end, capacity: Number(s.capacity) })),
        menu: form.menu.filter((m) => m.name.trim()).map((m) => ({ ...m, price: m.price === '' ? null : Number(m.price) })),
        popular: itemBody(form.popular),
        ownerPick: itemBody(form.ownerPick),
      }, place?.id);
      // 保存できたら店舗の一覧へ。結果（公開・下書き・翻訳の失敗）は一覧の上に出す
      saveFlash(d.place, d.translationFailed);
      refresh();
      navigate('/biz/place');
    } catch (err) {
      setSaveError(err);
    } finally {
      setBusy(false);
    }
  };

  // 下書きのときは、足りない項目に印をつける
  const bad = (k) => place && !place.published && place.missing.includes(k);
  const field = (k, labelText, input, hint) => (
    <label className={`field${bad(k) ? ' bad' : ''}`}>
      <span className="field-label">
        {labelText}
        {REQUIRED[k] && (k !== 'price' && k !== 'durationMin' ? true : form.category === 'experience') && <span className="req">必須</span>}
      </span>
      {input}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
  const chipsField = (k, labelText, input, hint) => (
    <div className={`field${bad(k) ? ' bad' : ''}`}>
      <span className="field-label">
        {labelText}
        {REQUIRED[k] && <span className="req">必須</span>}
      </span>
      {input}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
  const pref = prefOf(form.prefCode);
  const center = city ?? (pref ? { lat: pref.lat, lng: pref.lng } : { lat: 35.0, lng: 135.76 });

  return (
    <form onSubmit={save}>
      <Back to="/biz/place" label="店舗一覧" />
      <h1>{place ? '店舗の情報' : '店舗を追加'}</h1>
      <Status place={place} />

      <h2 className="section-title">基本の情報</h2>
      {chipsField('category', 'カテゴリ', <Chips multi={false} options={options('category', CATEGORIES, 'ja')} value={form.category} onChange={(c) => setForm((f) => ({ ...f, category: c, genre: GENRES[c]?.includes(f.genre) ? f.genre : null }))} label="カテゴリ" />)}
      {form.category &&
        chipsField(
          'genre',
          'ジャンル',
          <Chips multi={false} options={options('genre', GENRES[form.category], 'ja')} value={form.genre} onChange={set('genre')} label="ジャンル" />,
          '旅行者は、ジャンルでお店を絞り込めます（料理名ではなく、お店の種類で選んでください）',
        )}
      <div className={`field${bad('prefCode') || bad('cityId') ? ' bad' : ''}`}>
        <span className="field-label">
          お店のある市区町村<span className="req">必須</span>
        </span>
        <JapanPicker ja value={{ pref: form.prefCode, city: form.cityId }} onChange={({ pref: p, city: c }) => setForm((f) => ({ ...f, prefCode: p, cityId: c }))} />
        <span className="hint">{city ? `選んだ場所：${pref?.ja ?? ''} ${city.ja}` : '地図で地方 → 都道府県 → 市区町村の順に選んでください'}</span>
      </div>
      {field('name', '店名', <input value={form.name} onChange={set('name')} maxLength={80} />)}
      {field('address', '住所', <input value={form.address} onChange={set('address')} maxLength={200} autoComplete="street-address" />)}
      <div className={`field${bad('location') ? ' bad' : ''}`}>
        <span className="field-label">
          地図上の位置<span className="req">必須</span>
        </span>
        <PinPicker value={form.lat != null ? { lat: form.lat, lng: form.lng } : null} center={center} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <span className="hint">{form.lat != null ? 'ピンを動かすと位置を直せます' : '地図をタップして、お店の場所にピンを立ててください（2本指で拡大できます）'}</span>
      </div>

      <h2 className="section-title">写真</h2>
      <PhotoGrid photos={form.photos} onChange={set('photos')} />

      {field(
        'description',
        '説明文',
        <textarea value={form.description} onChange={set('description')} maxLength={MAX_DESCRIPTION} rows={6} />,
        `普段のお店の様子、どんな人がやっているか、当日の流れなど。日本語で書けば英語・中国語・韓国語に翻訳されます（${form.description.length}/${MAX_DESCRIPTION}文字）`,
      )}
      {chipsField(
        'priceBand',
        '値段帯（1人あたり）',
        <Chips multi={false} options={PRICE_BANDS.map((b) => ({ value: b, label: bandText(b, 'ja') }))} value={form.priceBand} onChange={set('priceBand')} label="値段帯" />,
        '一覧で「おおよその値段」として表示します',
      )}
      <div className="row">
        {field(
          'price',
          `料金（1人あたり・円）${form.category === 'experience' ? '' : '・任意'}`,
          <input type="number" inputMode="numeric" min={0} max={1000000} value={form.price} onChange={set('price')} />,
          '当日、現地で受け取る金額',
        )}
        {field(
          'durationMin',
          `所要時間（分）${form.category === 'experience' ? '' : '・任意'}`,
          <input type="number" inputMode="numeric" min={10} max={1440} step={5} value={form.durationMin} onChange={set('durationMin')} />,
        )}
      </div>
      {chipsField('payments', '現地での支払い方法（複数選べます）', <Chips options={options('paymentMethod', PAYMENT_METHODS, 'ja')} value={form.payments} onChange={set('payments')} label="支払い方法" />, '使える支払方法をすべて選んでください。旅行者は「使える支払方法」で絞り込めます')}
      {field(
        'link',
        '外部リンク（任意）',
        <input type="url" inputMode="url" placeholder="https://" value={form.link} onChange={set('link')} maxLength={500} />,
        'ホームページか Instagram のURLを1つ',
      )}

      <h2 className="section-title">地元らしさの情報</h2>
      <p className="small muted">点数は付けません。事実をそのまま載せ、旅行者が自分で判断します。正しく書いてください。</p>
      {chipsField(
        'localPct',
        '地元のお客さんの割合',
        <Chips multi={false} options={LOCAL_PCTS.map((v) => ({ value: v, label: `${v}%` }))} value={form.localPct} onChange={set('localPct')} label="地元のお客さんの割合" />,
        form.localPct != null ? `地元 ${form.localPct}%・その他（観光客・海外から）${100 - form.localPct}% として帯グラフで表示します` : 'おおよそで構いません',
      )}
      {field(
        'foundedYear',
        '創業年（西暦）',
        <input type="number" inputMode="numeric" min={FOUNDED_MIN} max={thisYear} value={form.foundedYear} onChange={set('foundedYear')} placeholder="例：1985" style={{ maxWidth: 160 }} />,
        form.foundedYear && Number(form.foundedYear) >= FOUNDED_MIN && Number(form.foundedYear) <= thisYear
          ? `営業 ${yearsOpen(Number(form.foundedYear))}年（毎年自動で増えます。旅行者は営業年数で絞り込めます）`
          : '創業した年を入れてください。営業年数は毎年自動で計算します',
      )}
      <div className="row">
        {field('station', '最寄り駅', <input value={form.station} onChange={set('station')} maxLength={40} placeholder="例：JR宇治駅" />)}
        {field(
          'stationKm',
          '駅からの距離（km）',
          <input type="number" inputMode="decimal" min={0} max={100} step={0.1} value={form.stationKm} onChange={set('stationKm')} />,
          '道のりのおよその距離（例：1.2）',
        )}
      </div>

      <h2 className="section-title">お店の設備・方針（任意）</h2>
      {chipsField('smoking', 'タバコ', <Chips multi={false} options={options('smoking', SMOKING, 'ja')} value={form.smoking} onChange={set('smoking')} label="タバコ" />)}
      {chipsField('pets', 'ペット', <Chips multi={false} options={options('pets', PETS, 'ja')} value={form.pets} onChange={set('pets')} label="ペット" />)}
      {chipsField('privateRoom', '個室', <Chips multi={false} options={options('privateRoom', [true, false], 'ja')} value={form.privateRoom} onChange={set('privateRoom')} label="個室" />)}

      <h2 className="section-title">メニュー表（任意）</h2>
      <MenuEditor rows={form.menu} onChange={set('menu')} />

      <h2 className="section-title">一番人気・店主のおすすめ（任意）</h2>
      <ItemEditor title="一番人気" value={form.popular} onChange={set('popular')} />
      <ItemEditor title="店主のおすすめ" value={form.ownerPick} onChange={set('ownerPick')} />

      <h2 className="section-title">店主のこだわり（任意）</h2>
      {field(
        'kodawari',
        'こだわり',
        <textarea value={form.kodawari} onChange={set('kodawari')} maxLength={1000} rows={4} placeholder="例：祖父の代から同じ石臼で抹茶を挽いています。常連さんとの世間話も楽しみの一つです。" />,
        '店主の人柄、営業の歴史、常連さん、普段のお店の様子など',
      )}
      <SinglePhoto label="こだわりの写真" value={form.kodawariPhoto} onChange={set('kodawariPhoto')} />

      <h2 className="section-title">このアプリからの予約の特典（任意）</h2>
      {field('perk', '特典', <input value={form.perk} onChange={set('perk')} maxLength={200} placeholder="例：お茶菓子を一品サービス" />, '書いた内容を、このアプリから予約したお客様に提供してください')}

      {form.category === 'experience' && (
        <>
          <h2 className="section-title">体験の項目</h2>
          {field('belongings', '持ち物（任意）', <input value={form.belongings} onChange={set('belongings')} maxLength={300} placeholder="例：汚れてもよい服" />)}
          {field('minPeople', '最少催行人数（任意）', <input type="number" inputMode="numeric" min={1} max={50} value={form.minPeople} onChange={set('minPeople')} />)}
        </>
      )}
      {form.category === 'restaurant' && (
        <>
          <h2 className="section-title">飲食店の項目</h2>
          {chipsField('dietSupport', '食事制限への対応（任意・いくつでも）', <Chips options={options('dietSupport', DIET_SUPPORT, 'ja')} value={form.dietSupport} onChange={set('dietSupport')} label="食事制限への対応" />)}
          {chipsField('menuStyle', 'コース／アラカルト（任意）', <Chips multi={false} options={options('menuStyle', MENU_STYLES, 'ja')} value={form.menuStyle} onChange={set('menuStyle')} label="コース／アラカルト" />)}
        </>
      )}

      <h2 className="section-title">予約の設定</h2>
      <SlotsEditor slots={form.slots} onChange={set('slots')} />
      {chipsField(
        'closedWeekdays',
        '定休日',
        <Chips options={WEEKDAYS.ja.map((w, i) => ({ value: i, label: w }))} value={form.closedWeekdays} onChange={set('closedWeekdays')} label="定休日" />,
        '臨時のお休みは、店舗の一覧の「日程（カレンダー）の変更」で日を選んで止められます（〇△✕ーの表示や、その日だけの人数も変えられます）',
      )}
      {chipsField('leadDays', '予約の受付締切', <Chips multi={false} options={LEAD} value={form.leadDays} onChange={(v) => set('leadDays')(v ?? 1)} label="受付締切" />)}

      <label className="check">
        <input type="checkbox" checked={form.publish} onChange={(e) => set('publish')(e.target.checked)} />
        <span>
          保存したら公開する
          <span className="hint">外すと非公開になり、旅行者の一覧に出なくなります</span>
        </span>
      </label>
      {missing.length > 0 && form.publish && <p className="notice small">公開するには、あと「{missing.map((k) => REQUIRED[k]).join('」「')}」の入力が必要です。足りないまま保存すると下書きになります。</p>}
      <ErrorNote error={saveError} ja />
      <div className="sticky-actions">
        {busy && (
          <p className="save-wait small" role="status">
            英語・中国語・韓国語への翻訳に 10〜20 秒かかります。このままお待ちください。終わると店舗の一覧に移ります。
          </p>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? '保存と翻訳をしています…' : '保存する'}
        </button>
      </div>
    </form>
  );
}

// 保存の結果を、移った先の店舗一覧で一度だけ出す
const FLASH = 'ld-biz-saved';
function saveFlash(place, translationFailed) {
  const text = place.published
    ? `「${place.name || '店名未入力'}」を保存して公開しました。`
    : place.missing.length
      ? `「${place.name || '店名未入力'}」を下書きとして保存しました。公開するには「${place.missing.map((k) => REQUIRED[k]).join('」「')}」を入力してください。`
      : `「${place.name || '店名未入力'}」を保存しました（非公開）。`;
  const note = translationFailed ? ' ただし翻訳に失敗したため、旅行者には日本語のまま表示されます。少し待ってから、もう一度保存してください。' : '';
  try {
    sessionStorage.setItem(FLASH, JSON.stringify({ ok: place.published && !translationFailed, text: text + note }));
  } catch {
    /* 出せなくても保存はできている */
  }
}
export function takeSaveFlash() {
  try {
    const v = JSON.parse(sessionStorage.getItem(FLASH) ?? 'null');
    sessionStorage.removeItem(FLASH);
    return v;
  } catch {
    return null;
  }
}

function Status({ place }) {
  if (!place) return <p className="muted">日本語で入力してください。保存すると英語・中国語（簡体字・繁体字）・韓国語に自動で翻訳され、必須の項目がそろっていればすぐに公開されます。</p>;
  return (
    <div className="card">
      <div className="status-line">
        {place.suspended ? (
          <span className="badge ng">運営により非公開</span>
        ) : place.published ? (
          <span className="badge ok">公開中</span>
        ) : (
          <span className="badge">{place.missing.length ? '下書き' : '非公開'}</span>
        )}
        {place.translatedAt ? <span className="small muted">翻訳済み（英・中・韓）</span> : <span className="small" style={{ color: 'var(--danger)' }}>⚠ 翻訳できていません</span>}
        {place.published && !place.suspended && (
          <a className="small" href={`/p/${place.id}`} target="_blank" rel="noreferrer">
            旅行者の画面で見る ↗
          </a>
        )}
      </div>
      {place.suspended && <p className="small" style={{ marginBottom: 0 }}>掲載内容について確認が必要なため、運営が非公開にしています。お問い合わせください。</p>}
    </div>
  );
}

// 写真を1枚送る（端末で小さくしてから）
async function upload(file) {
  const blob = await shrinkImage(file);
  return (await api.uploadPhoto(blob)).url;
}

function PhotoGrid({ photos, onChange }) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState(null);
  const add = async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    setError(null);
    setBusy(files.length);
    let next = photos;
    for (const file of files) {
      try {
        next = [...next, await upload(file)];
        onChange(next);
      } catch (err) {
        setError(err); // 失敗した写真だけ送り直せる。ほかの入力は消さない
      }
      setBusy((n) => n - 1);
    }
  };
  return (
    <div className="field">
      <span className="hint" style={{ marginBottom: 8 }}>
        {MAX_PHOTOS}枚まで。1枚目が一覧の写真になります。普段のお店の様子が伝わる写真がおすすめです。
      </span>
      <div className="photo-grid">
        {photos.map((src, i) => (
          <div className="photo-tile" key={src}>
            <img src={src} alt={`写真${i + 1}`} />
            {i === 0 && <span className="cover">一覧の写真</span>}
            <button type="button" className="icon-btn" aria-label={`写真${i + 1}を外す`} onClick={() => onChange(photos.filter((x) => x !== src))}>
              ✕
            </button>
            {i > 0 && (
              <button type="button" className="icon-btn" style={{ top: 'auto', bottom: 2 }} aria-label={`写真${i + 1}を1枚目にする`} onClick={() => onChange([src, ...photos.filter((x) => x !== src)])}>
                ★
              </button>
            )}
          </div>
        ))}
        {busy > 0 && <div className="photo-add">送信中…</div>}
        {photos.length + busy < MAX_PHOTOS && (
          <label className="photo-add">
            ＋ 写真を追加
            <input type="file" accept="image/*" multiple onChange={add} />
          </label>
        )}
      </div>
      <ErrorNote error={error} ja />
    </div>
  );
}

function SinglePhoto({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await upload(file));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="field">
      <span className="field-label">{label}（任意）</span>
      <div className="photo-grid" style={{ gridTemplateColumns: '120px' }}>
        {value ? (
          <div className="photo-tile">
            <img src={value} alt={label} />
            <button type="button" className="icon-btn" aria-label={`${label}を外す`} onClick={() => onChange(null)}>
              ✕
            </button>
          </div>
        ) : (
          <label className="photo-add">
            {busy ? '送信中…' : '＋ 写真'}
            <input type="file" accept="image/*" onChange={pick} disabled={busy} />
          </label>
        )}
      </div>
      <ErrorNote error={error} ja />
    </div>
  );
}

function ItemEditor({ title, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="card">
      <b>{title}</b>
      <div className="row" style={{ marginTop: 8 }}>
        <label className="field">
          <span className="field-label">名前</span>
          <input value={value.name} onChange={set('name')} maxLength={60} placeholder="例：石臼挽き抹茶セット" />
        </label>
        <label className="field" style={{ maxWidth: 120 }}>
          <span className="field-label">値段（円）</span>
          <input type="number" inputMode="numeric" min={0} value={value.price} onChange={set('price')} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">ひとこと</span>
        <input value={value.note} onChange={set('note')} maxLength={200} />
      </label>
      <SinglePhoto label={`${title}の写真`} value={value.photo} onChange={(photo) => onChange({ ...value, photo })} />
      <span className="hint">名前を空にすると載せません</span>
    </div>
  );
}

// メニュー表：料理名・値段・量（200g、2〜3人前など）・ひとこと。旅行者の言語に自動で翻訳して表で見せる
function MenuEditor({ rows, onChange }) {
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="field">
      <span className="hint" style={{ marginBottom: 8 }}>
        料理の名前と値段に加えて、<b>量</b>（例：200g、ごはん大盛り、2〜3人前）を書くと、海外のお客様が頼みやすくなります。{MAX_MENU}品まで。
      </span>
      {rows.map((r, i) => (
        <div className="menu-edit card" key={i}>
          <div className="row">
            <label className="field">
              <span className="field-label">料理名</span>
              <input value={r.name} maxLength={60} onChange={(e) => update(i, { name: e.target.value })} placeholder="例：きつねうどん" />
            </label>
            <label className="field" style={{ maxWidth: 110 }}>
              <span className="field-label">値段（円）</span>
              <input type="number" inputMode="numeric" min={0} value={r.price} onChange={(e) => update(i, { price: e.target.value })} />
            </label>
          </div>
          <div className="row">
            <label className="field" style={{ maxWidth: 150 }}>
              <span className="field-label">量</span>
              <input value={r.amount} maxLength={40} onChange={(e) => update(i, { amount: e.target.value })} placeholder="例：麺200g" />
            </label>
            <label className="field">
              <span className="field-label">ひとこと</span>
              <input value={r.note} maxLength={120} onChange={(e) => update(i, { note: e.target.value })} placeholder="例：だしは昆布とかつお" />
            </label>
          </div>
          <div className="btn-row" style={{ marginTop: 4 }}>
            <button type="button" className="btn small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="上へ">
              ↑
            </button>
            <button type="button" className="btn small" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="下へ">
              ↓
            </button>
            <button type="button" className="btn small danger" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              この料理を消す
            </button>
          </div>
        </div>
      ))}
      {rows.length < MAX_MENU && (
        <button type="button" className="btn" onClick={() => onChange([...rows, { name: '', price: '', amount: '', note: '' }])}>
          ＋ 料理を足す
        </button>
      )}
    </div>
  );
}

function SlotsEditor({ slots, onChange }) {
  const update = (i, patch) => onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="field">
      <span className="field-label">時間枠（何時から何時まで・何名まで）</span>
      <span className="hint" style={{ marginBottom: 8 }}>
        上限人数の内なら、予約はその場で確定します。時間枠がないと予約は受けず、チャットの質問だけを受けます。
      </span>
      {slots.map((s, i) => (
        <div className="slot-edit" key={i}>
          <input type="time" aria-label="開始時刻" value={s.time} onChange={(e) => update(i, { time: e.target.value })} step={300} />
          <span className="small">〜</span>
          <input type="time" aria-label="終了時刻" value={s.end ?? ''} onChange={(e) => update(i, { end: e.target.value })} step={300} />
          <input type="number" aria-label="上限人数" inputMode="numeric" min={1} max={MAX_CAPACITY} value={s.capacity} onChange={(e) => update(i, { capacity: e.target.value })} style={{ maxWidth: 64 }} />
          <span className="small">名</span>
          <button type="button" className="icon-btn" aria-label="この時間枠を消す" onClick={() => onChange(slots.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      {slots.length < MAX_SLOTS && (
        <button type="button" className="btn" onClick={() => onChange([...slots, slots.length ? { time: '14:00', end: '16:00', capacity: 6 } : { time: '10:00', end: '12:00', capacity: 6 }])}>
          ＋ 時間枠を足す
        </button>
      )}
    </div>
  );
}
