import React, { memo } from 'react';
import { Flame, Timer } from 'lucide-react';

type BrewingMethod = {
  name: string;
  temperature: string;
  time: string;
};

type TasteLevel = 1 | 2 | 3;

type TeaInfoData = {
  brewing: BrewingMethod[];
  taste: {
    flavors: string[];     // Вкусовые ноты: ореховый, медовый и т.д. (до 3)
    body: TasteLevel;      // Тело: 1-легкое, 2-среднее, 3-тяжелое
    sweetness: TasteLevel; // Сладость: 1-низкая, 2-средняя, 3-высокая
    astringency: TasteLevel; // Терпкость: 1-низкая, 2-средняя, 3-высокая
  };
  effects: string[];
};

// Мок данные
const MOCK_TEA_INFO: TeaInfoData = {
  brewing: [
    { name: 'Гайвань', temperature: '95°C', time: '10-15 сек' },
    { name: 'Чайник', temperature: '90°C', time: '2-3 мин' },
  ],
  taste: {
    flavors: ['Ореховый', 'Медовый', 'Древесный'],
    body: 2,
    sweetness: 3,
    astringency: 1,
  },
  effects: ['Бодрит', 'Согревает'],
};

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

const BrewingCard = memo<{ method: BrewingMethod; isFirst: boolean }>(({ method, isFirst }) => (
  <div className={`tea-brewing__card ${isFirst ? 'tea-brewing__card--primary' : ''}`}>
    <span className="tea-brewing__name">{method.name}</span>
    <div className="tea-brewing__stats">
      <div className="tea-brewing__stat">
        <Flame size={14} />
        <span>{method.temperature}</span>
      </div>
      <div className="tea-brewing__stat">
        <Timer size={14} />
        <span>{method.time}</span>
      </div>
    </div>
  </div>
));

BrewingCard.displayName = 'BrewingCard';

export const TeaInfo: React.FC = memo(() => {
  const info = MOCK_TEA_INFO;

  return (
    <section className="tea-info">
      {/* Заваривание */}
      <div className="tea-info__block">
        <h3 className="tea-info__title">Как заваривать</h3>
        <div className="tea-brewing__grid">
          {info.brewing.map((method, idx) => (
            <BrewingCard key={idx} method={method} isFirst={idx === 0} />
          ))}
        </div>
      </div>

      {/* Вкус */}
      <div className="tea-info__block">
        <h3 className="tea-info__title">Вкусовой профиль</h3>
        {info.taste.flavors.length > 0 && (
          <div className="tea-taste__flavors">
            {info.taste.flavors.slice(0, 3).map((flavor, idx) => (
              <span key={idx} className="tea-taste__flavor">{flavor}</span>
            ))}
          </div>
        )}
        <div className="tea-taste__levels">
          <LevelIndicator level={info.taste.body} label="Тело" />
          <LevelIndicator level={info.taste.sweetness} label="Сладость" />
          <LevelIndicator level={info.taste.astringency} label="Терпкость" />
        </div>
      </div>

      {/* Эффект */}
      {info.effects.length > 0 && (
        <div className="tea-info__block">
          <h3 className="tea-info__title">Эффект</h3>
          <div className="tea-effects__list">
            {info.effects.slice(0, 2).map((effect, idx) => (
              <span key={idx} className="tea-effects__tag">{effect}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});

TeaInfo.displayName = 'TeaInfo';
