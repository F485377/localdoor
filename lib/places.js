import { cityOf } from './cities.js';
import { LANGS, MAX_MENU, normalizeSlots, yearsOpen } from './domain.js';

// メニュー表（[{ name, price, amount, note }]）。おかしな値は捨てる
export const menuOf = (p) =>
  (Array.isArray(p?.menu) ? p.menu : []).filter((m) => typeof m?.name === 'string' && m.name.trim()).slice(0, MAX_MENU);

// 訳す元の日本語を集める（保存したときに4言語に訳す）。メニュー表は menu0Name・menu0Amount・menu0Note … として一緒に訳す
export function sourceTexts(p) {
  const menu = Object.fromEntries(
    menuOf(p).flatMap((m, i) => [
      [`menu${i}Name`, m.name ?? ''],
      [`menu${i}Amount`, m.amount ?? ''],
      [`menu${i}Note`, m.note ?? ''],
    ]),
  );
  return {
    ...menu,
    name: p.name ?? '',
    address: p.address ?? '',
    station: p.station ?? '',
    description: p.description ?? '',
    belongings: p.belongings ?? '',
    kodawari: p.kodawari ?? '',
    perk: p.perk ?? '',
    popularName: p.popular?.name ?? '',
    popularNote: p.popular?.note ?? '',
    pickName: p.ownerPick?.name ?? '',
    pickNote: p.ownerPick?.note ?? '',
  };
}

export const VISIBLE = { published: true, suspended: false, deletedAt: null };

// 旅行者に見せる形。lang の訳があればそれを、なければ日本語の原文を出す（translated: false）
export function travelerPlace(p, { full = false, lang = 'en' } = {}) {
  const l = LANGS.includes(lang) ? lang : 'en';
  const src = sourceTexts(p);
  // 日本語は原文のまま。ほかの言語は訳があれば訳
  const tr = l === 'ja' ? src : p.translatedAt ? p.i18n?.[l] : null;
  const city = cityOf(p.cityId);
  const t = (k) => (tr?.[k] || src[k]) ?? '';
  const base = {
    id: p.id,
    category: p.category,
    genre: p.genre ?? null,
    pref: p.prefCode,
    city: city ? { id: city.id, ja: city.ja, en: city.en, ko: city.ko } : null,
    station: t('station'),
    sample: p.sample,
    name: t('name'),
    nameJa: p.name,
    translated: Boolean(tr),
    photo: p.photos?.[0] ?? null,
    price: p.price,
    priceBand: p.priceBand,
    durationMin: p.durationMin,
    localPct: p.localPct,
    foundedYear: p.foundedYear ?? null,
    yearsOpen: yearsOpen(p.foundedYear),
    payments: p.payments ?? [],
    stationKm: p.stationKm,
    lat: p.lat,
    lng: p.lng,
    smoking: p.smoking,
    pets: p.pets,
    privateRoom: p.privateRoom,
    hasPerk: Boolean(p.perk?.trim()),
    bookable: normalizeSlots(p.slots).length > 0,
  };
  if (!full) return base;
  const item = (obj, nameKey, noteKey) =>
    obj?.name ? { name: t(nameKey), nameJa: obj.name, note: t(noteKey), price: obj.price ?? null, photo: obj.photo ?? null } : null;
  return {
    ...base,
    photos: p.photos ?? [],
    address: t('address'),
    addressJa: p.address,
    description: t('description'),
    link: p.link,
    belongings: t('belongings'),
    minPeople: p.minPeople,
    dietSupport: p.dietSupport,
    menuStyle: p.menuStyle,
    leadDays: p.leadDays,
    closedWeekdays: p.closedWeekdays,
    kodawari: t('kodawari'),
    kodawariPhoto: p.kodawariPhoto,
    perk: t('perk'),
    popular: item(p.popular, 'popularName', 'popularNote'),
    ownerPick: item(p.ownerPick, 'pickName', 'pickNote'),
    menu: menuOf(p).map((m, i) => ({ name: t(`menu${i}Name`), nameJa: m.name, price: m.price ?? null, amount: t(`menu${i}Amount`), note: t(`menu${i}Note`) })),
  };
}
