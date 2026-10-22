import { useI18n } from '../i18n/index.jsx';
import { ErrorNote, Spinner, useLoad } from '../ui.jsx';

// 写真のクレジット：イメージ写真（public/photos）の撮った人・ライセンス・元のページ
export default function Credits() {
  const { t } = useI18n();
  const { data, error, loading } = useLoad(() => fetch('/photos/credits.json').then((r) => r.json()), []);
  if (loading && !data) return <Spinner kind="rows" />;
  return (
    <>
      <h1 className="page-title">{t('menu.credits')}</h1>
      <p className="small muted">{t('credits.intro')}</p>
      <ErrorNote error={error} />
      <ul className="credits">
        {data?.credits.map((c) => (
          <li key={c.file}>
            <img src={c.file} alt="" loading="lazy" />
            <span>
              <a href={c.source} target="_blank" rel="noopener noreferrer">
                {c.title}
              </a>
              <br />
              <span className="small">
                {c.artist} ·{' '}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
