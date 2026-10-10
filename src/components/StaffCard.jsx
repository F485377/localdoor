import { useI18n } from '../i18n/index.jsx';
import { localLanguageOf } from '../format.js';

// お店の国の言語で書いた予約内容。現地の言葉が話せなくても、見せれば伝わる
const TEMPLATES = {
  ja: { title: '予約しています。', place: '店名', name: '名前', when: '日時', party: (n) => `${n}名`, people: '人数', note: '備考' },
  ko: { title: '예약했습니다.', place: '가게', name: '이름', when: '일시', party: (n) => `${n}명`, people: '인원', note: '요청' },
  zh: { title: '我有预约。', place: '店名', name: '姓名', when: '时间', party: (n) => `${n}位`, people: '人数', note: '备注' },
  fr: { title: 'J’ai une réservation.', place: 'Restaurant', name: 'Nom', when: 'Date', party: (n) => `${n} pers.`, people: 'Personnes', note: 'Remarque' },
  th: { title: 'ฉันจองไว้แล้ว', place: 'ร้าน', name: 'ชื่อ', when: 'วันเวลา', party: (n) => `${n} ท่าน`, people: 'จำนวน', note: 'หมายเหตุ' },
  es: { title: 'Tengo una reservación.', place: 'Lugar', name: 'Nombre', when: 'Fecha', party: (n) => `${n} personas`, people: 'Personas', note: 'Nota' },
  en: { title: 'I have a reservation.', place: 'Place', name: 'Name', when: 'Date', party: (n) => `${n}`, people: 'Party size', note: 'Note' },
};

export default function StaffCard({ reservation, place }) {
  const { t } = useI18n();
  const lang = localLanguageOf(place.country);
  const tpl = TEMPLATES[lang] ?? TEMPLATES.en;
  return (
    <div className="staff-card">
      <div className="small muted">{t('showStaff')}</div>
      <p lang={lang}>
        <strong>{tpl.title}</strong>
        <br />
        {tpl.place}: {place.localName || place.name}
        <br />
        {tpl.name}: {reservation.name}
        <br />
        {tpl.when}: {reservation.date} {reservation.time}
        <br />
        {tpl.people}: {tpl.party(reservation.partySize)}
        {reservation.note && (
          <>
            <br />
            {tpl.note}: {reservation.note}
          </>
        )}
      </p>
    </div>
  );
}
