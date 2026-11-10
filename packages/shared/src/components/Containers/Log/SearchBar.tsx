import React from 'react';
import { ChevronDown, ChevronUp } from '@kubed/icons';
import { IconButton, MatchCount, SearchBarWrap, SearchInput } from './styles';

interface Props {
  keyword: string;
  matchCount: number;
  filterActive: boolean;
  disabled?: boolean;
  onKeywordChange: (value: string) => void;
  onToggleFilter: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M2 3.25h12l-4.25 5.5v3.5L7.25 11V8.75L2 3.25z" />
    </svg>
  );
}

export function LogSearchBar({
  keyword,
  matchCount,
  filterActive,
  disabled,
  onKeywordChange,
  onToggleFilter,
  onPrev,
  onNext,
}: Props) {
  const label = matchCount === 1 ? t('LOG_MATCH') : t('LOG_MATCHES');
  const navDisabled = disabled || matchCount === 0;

  return (
    <SearchBarWrap className="container-log-searchbar">
      <MatchCount data-test="container-log-match-count">
        {matchCount} {label}
      </MatchCount>
      <SearchInput
        data-test="container-log-match"
        placeholder={t('SEARCH_BY_KEYWORD')}
        value={keyword}
        disabled={disabled}
        onChange={event => onKeywordChange(event.target.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter') {
            return;
          }
          event.preventDefault();
          if (event.shiftKey) {
            onPrev();
          } else {
            onNext();
          }
        }}
      />
      <IconButton
        type="button"
        data-test="container-log-match-filter"
        title={t('FILTER_LOG_LINES')}
        $active={filterActive}
        disabled={navDisabled}
        onClick={onToggleFilter}
      >
        <FilterIcon />
      </IconButton>
      <IconButton
        type="button"
        data-test="container-log-match-prev"
        title={t('PREVIOUS_MATCH')}
        disabled={navDisabled}
        onClick={onPrev}
      >
        <ChevronUp size={16} color="#FFF" />
      </IconButton>
      <IconButton
        type="button"
        data-test="container-log-match-next"
        title={t('NEXT_MATCH')}
        disabled={navDisabled}
        onClick={onNext}
      >
        <ChevronDown size={16} color="#FFF" />
      </IconButton>
    </SearchBarWrap>
  );
}
