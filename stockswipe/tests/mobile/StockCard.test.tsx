import React from 'react';
import { render } from '@testing-library/react-native';
import { StockCard } from '../../mobile/components/StockCard';
import { ScoreBadge } from '../../mobile/components/ScoreBadge';
import { FactorTag } from '../../mobile/components/FactorTag';

const mockCard = {
  ticker: 'NVDA',
  name: 'NVIDIA Corporation',
  sector: 'Technology',
  composite_score: 82.4,
  factor_tags: ['Strong momentum', 'Cheap vs peers'],
  sparkline: [100, 105, 102, 110, 115, 112, 120],
  price: 134.22,
  change_pct: 2.14,
};

describe('StockCard', () => {
  it('renders ticker', () => {
    const { getByText } = render(<StockCard card={mockCard} />);
    expect(getByText('NVDA')).toBeTruthy();
  });

  it('renders company name', () => {
    const { getByText } = render(<StockCard card={mockCard} />);
    expect(getByText('NVIDIA Corporation')).toBeTruthy();
  });

  it('renders disclaimer', () => {
    const { getByText } = render(<StockCard card={mockCard} />);
    expect(getByText(/Not financial advice/i)).toBeTruthy();
  });
});

describe('ScoreBadge', () => {
  it('renders score', () => {
    const { getByText } = render(<ScoreBadge score={82} />);
    expect(getByText('82')).toBeTruthy();
  });
});

describe('FactorTag', () => {
  it('renders up to 3 tags', () => {
    const tags = ['A', 'B', 'C', 'D'];
    const { queryByText } = render(<FactorTag tags={tags} />);
    expect(queryByText('A')).toBeTruthy();
    expect(queryByText('D')).toBeNull(); // 4th should be hidden
  });
});
