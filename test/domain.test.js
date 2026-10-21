// 予約のルール（lib/domain.js）の単体テスト：npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dayMark, yearsOpen, dayOpen, distanceKm, isPast, missingFields, normalizeSlots, safeUrl, slotsFor, weekday } from '../lib/domain.js';

// 2026-10-13（火）12:00 日本時間
const NOW = new Date('2026-10-13T12:00:00+09:00');
const place = { leadDays: 1, closedWeekdays: [3], slots: [{ time: '10:00', end: '12:00', capacity: 4 }, { time: '14:00', end: '16:00', capacity: 6 }] };

test('日付の計算', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(weekday('2026-10-14'), 3);
});

test('受付締切・定休日・受付停止日・予約できる期間', () => {
  assert.equal(dayOpen(place, '2026-10-13', new Set(), NOW), false, '前日までの店は当日予約できない');
  assert.equal(dayOpen({ ...place, leadDays: 0 }, '2026-10-13', new Set(), NOW), true, '当日OKの店');
  assert.equal(dayOpen(place, '2026-10-14', new Set(), NOW), false, '水曜は定休日');
  assert.equal(dayOpen(place, '2026-10-15', new Set(), NOW), true);
  assert.equal(dayOpen(place, '2026-10-15', new Set(['2026-10-15']), NOW), false, '受付停止日');
  assert.equal(dayOpen(place, addDays('2026-10-13', 91), new Set(), NOW), false, '90日より先は予約できない');
});

test('時間枠の残り人数と、当日の過ぎた枠', () => {
  const s = slotsFor(place, '2026-10-15', { '10:00': 3 }, NOW);
  assert.deepEqual(s, [
    { time: '10:00', end: '12:00', capacity: 4, left: 1 },
    { time: '14:00', end: '16:00', capacity: 6, left: 6 },
  ]);
  const today = slotsFor(place, '2026-10-13', {}, NOW);
  assert.deepEqual(today.map((x) => x.time), ['14:00'], '12時の時点で10時の枠は出さない');
  assert.equal(slotsFor(place, '2026-10-15', { '14:00': 9 }, NOW)[1].left, 0, '残りはマイナスにしない');
});

test('その日だけの定員（カレンダーで調節）', () => {
  const s = slotsFor(place, '2026-10-15', { '14:00': 2 }, NOW, { '10:00': 0, '14:00': 10 });
  assert.deepEqual(s, [{ time: '14:00', end: '16:00', capacity: 10, left: 8 }], '0 の枠は止める、増やした枠はその定員で');
});

test('時間枠の整形：終了は開始より後。不正な値・重複を捨て、時刻順に', () => {
  const s = normalizeSlots([
    { time: '14:00', end: '15:00', capacity: 3 },
    { time: '09:30', end: '11:00', capacity: 2 },
    { time: '14:00', end: '16:00', capacity: 5 },
    { time: '25:00', end: '26:00', capacity: 1 },
    { time: '10:00', end: '12:00', capacity: 0 },
    { time: '11:00', end: '13:00', capacity: 999 },
    { time: '12:00', end: '11:00', capacity: 3 },
    { time: '13:00', capacity: 3 },
  ]);
  assert.deepEqual(s, [
    { time: '09:30', end: '11:00', capacity: 2 },
    { time: '11:00', end: '13:00', capacity: 50 },
    { time: '14:00', end: '15:00', capacity: 3 },
  ]);
  assert.deepEqual(normalizeSlots('nope'), []);
});

test('予約の日時を過ぎたら完了', () => {
  assert.equal(isPast({ date: '2026-10-13', time: '11:59' }, NOW), true);
  assert.equal(isPast({ date: '2026-10-13', time: '12:01' }, NOW), false);
});

test('公開に必要な項目', () => {
  assert.ok(missingFields({ name: '店' }).includes('address'));
  const full = { name: 'a', category: 'experience', prefCode: '26', cityId: '26204', station: 'JR宇治駅', address: 'a', lat: 34.9, lng: 135.8, description: 'a', priceBand: 'lt1000', price: 0, durationMin: 60, payments: ['cash'], localPct: 0, foundedYear: 1985, stationKm: 0 };
  assert.deepEqual(missingFields(full), [], '料金0円・地元0%・距離0kmも入力済みとみなす');
  assert.deepEqual(missingFields({ ...full, lat: null }), ['location'], '地図上の位置は必須');
  assert.deepEqual(missingFields({ ...full, payments: [] }), ['payments'], '支払方法は1つ以上');
  assert.deepEqual(missingFields({ ...full, foundedYear: null }), ['foundedYear'], '創業年は必須');
  assert.deepEqual(missingFields({ ...full, price: null }), ['price'], '体験は料金が必須');
  assert.deepEqual(missingFields({ ...full, category: 'restaurant', price: null, durationMin: null }), [], '飲食店は料金・所要時間が任意');
});

test('一覧の〇△✕', () => {
  const day = (open, slots) => ({ open, slots });
  assert.equal(dayMark(day(false, [])), 'x', '休み');
  assert.equal(dayMark(day(true, [{ capacity: 6, left: 6 }]), 2), 'o');
  assert.equal(dayMark(day(true, [{ capacity: 6, left: 1 }, { capacity: 6, left: 0 }]), 1), 'limited', '残りが合計の2割以下');
  assert.equal(dayMark(day(true, [{ capacity: 6, left: 3 }]), 4), 'x', '検索した人数で入れる枠がない');
});

test('2点間の距離', () => {
  const km = distanceKm({ lat: 34.9858, lng: 135.7588 }, { lat: 34.8893, lng: 135.8077 }); // 京都駅〜JR宇治駅
  assert.ok(km > 11 && km < 12, String(km));
});

test('外部リンクは http(s) だけ', () => {
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,hi'), null);
  assert.equal(safeUrl('example.com'), null);
  assert.equal(safeUrl(''), null);
});

test('全国の市区町村のデータ', async () => {
  const { PREFS, REGIONS } = await import('../lib/japan.js');
  const { cities, cityOf } = await import('../lib/cities.js');
  assert.equal(PREFS.length, 47);
  assert.equal(REGIONS.flatMap((r) => r.prefs).length, 47, 'どの都道府県もどこかの地方に入る');
  assert.equal(cities.length, 1741, '市区町村の数（総務省の一覧と同じ）');
  assert.ok(cities.every((c) => c.lat && c.lng && c.en && c.ko), 'どの市区町村にも位置と英語・韓国語の名前がある');
  assert.equal(cityOf('26204').ja, '宇治市');
  assert.equal(cityOf('26204').en, 'Uji');
  assert.equal(cityOf('13101').ja, '千代田区');
});

test('事業者が決めた印（〇△ー）', () => {
  const slots = [{ time: '10:00', capacity: 10, left: 10 }];
  assert.equal(dayMark({ open: true, slots, markAs: 'limited' }), 'limited', '空いていても △ にできる');
  assert.equal(dayMark({ open: true, slots: [{ time: '10:00', capacity: 10, left: 1 }], markAs: 'o' }), 'o', '残りわずかでも 〇 にできる');
  assert.equal(dayMark({ open: true, slots: [{ time: '10:00', capacity: 10, left: 0 }], markAs: 'o' }), 'x', '満席なら 〇 にしていても ✕');
  assert.equal(dayMark({ open: false, slots: [], undecided: true }), 'none', '未定は ー');
});

test('営業年数は創業年から自動で計算', () => {
  assert.equal(yearsOpen(1985, new Date('2026-10-20T03:00:00Z')), 41);
  assert.equal(yearsOpen(2026, new Date('2026-10-20T03:00:00Z')), 0);
  assert.equal(yearsOpen(null), null);
});
