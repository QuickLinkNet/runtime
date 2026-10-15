import { Fragment } from 'react';
import { keywordDefinitionByLabel, keywordPattern } from '../../../game/keywordDefinitions';
import { useI18n } from '../../../i18n';

export function KeywordText({ text }: { text: string }) {
  const { t } = useI18n();
  const parts = text.split(keywordPattern);
  return <>{parts.map((part, index) => {
    const definition = keywordDefinitionByLabel.get(part.toLocaleUpperCase('de'));
    if (!definition) return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    return (
      <span className="keyword-term" key={`${part}-${index}`}>
        {part}
        <span className="keyword-tooltip" role="tooltip">
          <b>{t(`keyword.${definition.id}.label`)}</b>
          {t(`keyword.${definition.id}.short`)}
        </span>
      </span>
    );
  })}</>;
}
