import { Colors } from '../constants/theme';
import { usePortfolio, Position } from '../hooks/usePortfolio';

const DISCLAIMER = 'This is not investment advice. All portfolios are simulated. Past performance does not guarantee future results.';

function PositionRow({ pos }: { pos: Position }) {
  const up = pos.return_pct >= 0;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0',
      borderBottom: `1px solid ${Colors.border}`,
    }}>
      <div>
        <div style={{ color: Colors.text, fontWeight: 700, fontSize: 15 }}>{pos.ticker}</div>
        <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>Since {pos.entry_date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: Colors.text, fontSize: 15 }}>${pos.current_price.toFixed(2)}</div>
        <div style={{ color: up ? Colors.green : Colors.red, fontWeight: 600, fontSize: 13, marginTop: 2 }}>
          {up ? '+' : ''}{pos.return_pct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const userId = localStorage.getItem('user_id') ?? '';
  const { portfolio, loading, error } = usePortfolio(userId);

  if (loading && !portfolio) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: Colors.red, textAlign: 'center', paddingTop: 40 }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 40px' }}>
      <h1 style={{ color: Colors.text, fontSize: 22, fontWeight: 800, marginBottom: 20 }}>My Portfolio</h1>

      {/* Summary stats */}
      <div style={{
        display: 'flex',
        gap: 12,
        background: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <Stat
          label="Total Return"
          value={`${(portfolio?.total_return ?? 0) >= 0 ? '+' : ''}${portfolio?.total_return.toFixed(2) ?? '0'}%`}
          color={(portfolio?.total_return ?? 0) >= 0 ? Colors.green : Colors.red}
        />
        <Stat
          label="Hit Rate"
          value={`${((portfolio?.hit_rate ?? 0) * 100).toFixed(0)}%`}
        />
        <Stat
          label="Positions"
          value={String(portfolio?.positions.length ?? 0)}
        />
      </div>

      {/* Best/Worst calls */}
      {portfolio?.best_call && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          background: Colors.surface,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 12,
        }}>
          <span style={{ color: Colors.textSecondary, fontSize: 13 }}>🏆 Best Call</span>
          <span style={{ color: Colors.green, fontWeight: 700, fontSize: 13 }}>
            {portfolio.best_call.ticker} +{portfolio.best_call.return_pct.toFixed(2)}%
          </span>
        </div>
      )}
      {portfolio?.worst_call && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          background: Colors.surface,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
        }}>
          <span style={{ color: Colors.textSecondary, fontSize: 13 }}>📉 Worst Call</span>
          <span style={{ color: Colors.red, fontWeight: 700, fontSize: 13 }}>
            {portfolio.worst_call.ticker} {portfolio.worst_call.return_pct.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Positions list */}
      {(portfolio?.positions ?? []).length === 0 ? (
        <div style={{ color: Colors.textSecondary, textAlign: 'center', paddingTop: 32, fontSize: 14 }}>
          Swipe ↑ on a card to add it to your portfolio!
        </div>
      ) : (
        portfolio?.positions.map(p => <PositionRow key={`${p.ticker}-${p.entry_date}`} pos={p} />)
      )}

      <div style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 32 }}>
        {DISCLAIMER}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ color: Colors.textSecondary, fontSize: 11, fontWeight: 600 }}>{label}</div>
      <div style={{ color: color ?? Colors.text, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: `3px solid ${Colors.border}`,
      borderTop: `3px solid ${Colors.green}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
