import React, { useEffect, useMemo, useState } from 'react';
import { CaretDown, TimedTask } from '@kubed/icons';
import {
  CUSTOM_TIME_UNITS,
  RELATIVE_TIME_OPTIONS,
  RelativeTimeValue,
  TimeUnit,
  createRelativeTime,
  parseRelativeTime,
} from './relativeTime';
import {
  CustomTimeInput,
  CustomTimeRow,
  OkButton,
  TimeDivider,
  TimeDropdown,
  TimeMask,
  TimeOption,
  TimeOptionList,
  TimeSectionTitle,
  TimeSelectorWrap,
  TimeTrigger,
  UnitMenu,
  UnitTrigger,
} from './styles';

interface Props {
  value: RelativeTimeValue;
  onChange: (value: RelativeTimeValue) => void;
  zIndex?: number;
}

function unitLabel(unit: TimeUnit) {
  return t(`TIME_${unit.toUpperCase()}`, { count: 1 }).replace(/^1\s*/, '');
}

function timeLabel(value: RelativeTimeValue) {
  return t('LAST_TIME', {
    value: t(`TIME_${value.unit.toUpperCase()}`, { count: value.value }),
  });
}

export function RelativeTimeSelector({ value, onChange, zIndex = 3 }: Props) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(value.value));
  const [customUnit, setCustomUnit] = useState<TimeUnit>(value.unit);
  const [unitOpen, setUnitOpen] = useState(false);
  const options = useMemo(() => RELATIVE_TIME_OPTIONS.map(parseRelativeTime), []);
  const invalid = !Number.isInteger(Number(customValue)) || Number(customValue) <= 0;

  useEffect(() => {
    setCustomValue(String(value.value));
    setCustomUnit(value.unit);
  }, [value]);

  const close = () => {
    setOpen(false);
    setUnitOpen(false);
  };

  const select = (next: RelativeTimeValue) => {
    onChange(next);
    close();
  };

  return (
    <TimeSelectorWrap $zIndex={zIndex} data-test="container-log-time-range">
      <TimeMask $open={open} $zIndex={zIndex} onClick={close} />
      <TimeTrigger type="button" onClick={() => setOpen(current => !current)}>
        <TimedTask size={16} color="#36435C" fill="#C1C9D1" />
        <span className="relative-time-selector__label">{timeLabel(value)}</span>
        <CaretDown size={16} color="#36435C" fill="#36435C" />
      </TimeTrigger>
      {open && (
        <TimeDropdown $zIndex={zIndex}>
          <TimeSectionTitle>{t('SELECT_TIME_RANGE')}</TimeSectionTitle>
          <TimeOptionList>
            {options.map(option => (
              <TimeOption
                key={`${option.value}${option.unit}`}
                type="button"
                $selected={option.seconds === value.seconds}
                onClick={() => select(option)}
              >
                {timeLabel(option)}
              </TimeOption>
            ))}
          </TimeOptionList>
          <TimeDivider />
          <TimeSectionTitle>{t('CUSTOM_TIME_RANGE')}</TimeSectionTitle>
          <CustomTimeRow>
            <span>{t('LAST_TIME', { value: '' }).trim()}</span>
            <CustomTimeInput
              min={1}
              inputMode="numeric"
              value={customValue}
              onChange={event => setCustomValue(event.target.value.replace(/[^\d]/g, ''))}
            />
            <div style={{ position: 'relative' }}>
              <UnitTrigger type="button" onClick={() => setUnitOpen(current => !current)}>
                <span>{unitLabel(customUnit)}</span>
                <CaretDown size={16} color="#36435C" fill="#36435C" />
              </UnitTrigger>
              {unitOpen && (
                <UnitMenu>
                  {CUSTOM_TIME_UNITS.map(unit => (
                    <TimeOption
                      key={unit}
                      type="button"
                      $selected={unit === customUnit}
                      onClick={() => {
                        setCustomUnit(unit);
                        setUnitOpen(false);
                      }}
                    >
                      {unitLabel(unit)}
                    </TimeOption>
                  ))}
                </UnitMenu>
              )}
            </div>
            <OkButton
              type="button"
              disabled={invalid}
              onClick={() => {
                const next = Number(customValue);
                if (!Number.isInteger(next) || next <= 0) {
                  return;
                }
                select(createRelativeTime(next, customUnit));
              }}
            >
              {t('OK')}
            </OkButton>
          </CustomTimeRow>
        </TimeDropdown>
      )}
    </TimeSelectorWrap>
  );
}
