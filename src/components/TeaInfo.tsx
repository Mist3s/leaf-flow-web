import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Flame, Timer, Scale, Info } from 'lucide-react';
import { BrewProfile, ProductAttribute } from '../types/catalog';

type Props = {
  brewingProfiles: BrewProfile[];
  attributes: ProductAttribute[];
};

type TasteLevel = 1 | 2 | 3;

const LevelIndicator = memo<{ level: TasteLevel; label: string }>(({ level, label }) => {
  const percentage = Math.round((level / 3) * 100);
  return (
    <div className="tea-taste__item">
      <span className="tea-taste__label">{label}</span>
      <div className="tea-taste__bar">
        <div className="tea-taste__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
});

LevelIndicator.displayName = 'LevelIndicator';

const BrewingCard = memo<{ profile: BrewProfile; isFirst: boolean }>(({ profile, isFirst }) => {
  const [showNote, setShowNote] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Закрытие по клику вне тултипа или скроллу
  useEffect(() => {
    if (!showNote) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowNote(false);
      }
    };
    const handleScroll = () => setShowNote(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showNote]);

  // Клик — toggle для мобильных
  const handleToggleNote = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNote(prev => !prev);
  }, []);

  // Hover — только для десктопа (показ с небольшой задержкой)
  const handleMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setShowNote(true), 120);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setShowNote(false);
  }, []);

  return (
    <div className={`tea-brewing__card ${isFirst ? 'tea-brewing__card--primary' : ''}`}>
      <div className="tea-brewing__header">
        <span className="tea-brewing__name">{profile.method}</span>
        {profile.note && (
          <div
            ref={wrapperRef}
            className="tea-brewing__note-wrapper"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`tea-brewing__note-btn ${showNote ? 'tea-brewing__note-btn--active' : ''}`}
              onClick={handleToggleNote}
              aria-label="Подсказка по завариванию"
            >
              <Info size={14} />
            </button>
            {showNote && (
              <div className="tea-brewing__tooltip">
                <div className="tea-brewing__tooltip-arrow" />
                <p className="tea-brewing__tooltip-text">{profile.note}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="tea-brewing__stats">
        <div className="tea-brewing__stat">
          <Scale size={14} />
          <span>{profile.weight}</span>
        </div>
        <div className="tea-brewing__stat">
          <Flame size={14} />
          <span>{profile.temperature}</span>
        </div>
        <div className="tea-brewing__stat">
          <Timer size={14} />
          <span>{profile.brew_time}</span>
        </div>
      </div>
    </div>
  );
});

BrewingCard.displayName = 'BrewingCard';

// Маппинг кодов атрибутов на читаемые названия
const ATTRIBUTE_LABELS: Record<string, string> = {
  body: 'Тело',
  sweetness: 'Сладость',
  astringency: 'Терпкость',
};

// Коды атрибутов которые отображаются как scale (уровни 1-3)
const SCALE_CODES = ['body', 'sweetness', 'astringency'];

// Код атрибута вкуса
const TASTE_CODE = 'taste';

// Код атрибута эффекта
const EFFECT_CODE = 'effect';

export const TeaInfo: React.FC<Props> = memo(({ brewingProfiles, attributes }) => {
  // Фильтруем активные профили заваривания
  const activeProfiles = brewingProfiles.filter(p => p.is_active);
  
  // Атрибуты-шкалы (body, sweetness, astringency)
  const scaleAttrs = attributes.filter(
    attr => attr.is_active && SCALE_CODES.includes(attr.code)
  );
  
  // Атрибут вкуса (taste)
  const tasteAttr = attributes.find(
    attr => attr.is_active && attr.code === TASTE_CODE
  );
  
  // Атрибут эффекта (effect)
  const effectAttr = attributes.find(
    attr => attr.is_active && attr.code === EFFECT_CODE
  );

  // Получаем значения для chips-атрибутов
  const flavors = tasteAttr?.values.slice(0, 3) || [];
  const effects = effectAttr?.values.slice(0, 2) || [];

  // Маппинг slug → уровень для разных атрибутов
  const LEVEL_MAP: Record<string, TasteLevel> = {
    // Тело
    light: 1,
    medium: 2,
    full: 3,
    // Терпкость и Сладость
    low: 1,
    high: 3,
    // Числовые значения
    '1': 1,
    '2': 2,
    '3': 3,
  };

  // Функция для получения уровня из значения атрибута
  const getLevel = (attr: ProductAttribute): TasteLevel => {
    const activeValue = attr.values.find(v => v.is_active);
    if (!activeValue) return 1;
    const slug = activeValue.slug.toLowerCase();
    return LEVEL_MAP[slug] || 1;
  };

  return (
    <section className="tea-info">
      {/* Заваривание */}
      {activeProfiles.length > 0 && (
        <div className="tea-info__block">
          <h3 className="tea-info__title">Как заваривать</h3>
          <div className="tea-brewing__grid">
            {activeProfiles.map((profile, idx) => (
              <BrewingCard key={profile.id} profile={profile} isFirst={idx === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Вкус */}
      {(flavors.length > 0 || scaleAttrs.length > 0) && (
        <div className="tea-info__block">
          <h3 className="tea-info__title">Вкусовой профиль</h3>
          {flavors.length > 0 && (
            <div className="tea-taste__flavors">
              {flavors.map((flavor) => (
                <span key={flavor.id} className="tea-taste__flavor">{flavor.name}</span>
              ))}
            </div>
          )}
          {scaleAttrs.length > 0 && (
            <div className="tea-taste__levels">
              {scaleAttrs.map((attr) => (
                <LevelIndicator 
                  key={attr.id} 
                  level={getLevel(attr)} 
                  label={ATTRIBUTE_LABELS[attr.code] || attr.name} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Эффект */}
      {effects.length > 0 && (
        <div className="tea-info__block">
          <h3 className="tea-info__title">Эффект</h3>
          <div className="tea-effects__list">
            {effects.map((effect) => (
              <span key={effect.id} className="tea-effects__tag">{effect.name}</span>
            ))}
          </div>
          <p className="tea-info__note">
            Важно: эффект индивидуален и зависит от чувствительности к кофеину, крепости и объёма напитка, а также времени употребления.
          </p>
        </div>
      )}
    </section>
  );
});

TeaInfo.displayName = 'TeaInfo';
