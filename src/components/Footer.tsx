import type { Lang, Strings } from '../i18n';
import type { IndexData, YearData } from '../types';
import { isoDate, integer } from '../lib/format';
import { IconExternal } from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  index: IndexData;
  year: YearData;
}

export function Footer({ t, lang, index, year }: Props) {
  return (
    <footer className="site-footer" id="about">
      <div className="page">
        <div className="site-footer__cols">
          <section>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutData}</p>
            <p>
              <a href={index.source.docs} target="_blank" rel="noopener noreferrer">
                {index.source.dataset} <IconExternal />
              </a>
              <br />
              {t.updated(isoDate(index.generatedAt, lang))} ·{' '}
              <a href={index.source.licenceUrl} target="_blank" rel="noopener noreferrer">
                {t.licence}
              </a>
            </p>
          </section>

          <section>
            <h2>{t.aboutMethodTitle}</h2>
            <p>{t.aboutMethod}</p>
            <p>
              {integer(year.rows, lang)} {lang === 'en' ? 'source rows' : lang === 'sv' ? 'källrader' : 'lähderiviä'} ·{' '}
              {year.year}
            </p>
          </section>

          <section>
            <h2>{t.aboutBalanceTitle}</h2>
            <p>{t.aboutBalance}</p>
          </section>

          <section>
            <h2>{t.aboutNamesTitle}</h2>
            <p>{t.aboutNames}</p>
            <p>
              {index.population.note.split('.')[0]}.{' '}
              <a href={index.population.source} target="_blank" rel="noopener noreferrer">
                Tilastokeskus <IconExternal />
              </a>
            </p>
          </section>
        </div>
      </div>
    </footer>
  );
}
