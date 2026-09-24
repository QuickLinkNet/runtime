import { Fragment } from 'react';
import { keywordDefinitionByLabel, keywordPattern } from '../../../game/keywordDefinitions';

export function KeywordText({ text }: { text: string }) {
  const parts = text.split(keywordPattern);
  return <>{parts.map((part, index) => {
    const definition = keywordDefinitionByLabel.get(part.toLocaleUpperCase('de'));
    if (!definition) return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    return (
      <span className="keyword-term" key={`${part}-${index}`}>
        {part}
        <span className="keyword-tooltip" role="tooltip">
          <b>{definition.label}</b>
          {definition.shortDescription}
        </span>
      </span>
    );
  })}</>;
}
