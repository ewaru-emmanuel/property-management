import { useBuildings } from '../../context/BuildingsContext';

function Header({ onAdminClick, onLogout, onMenuToggle }) {
  const {
    buildings,
    selectedBuilding,
    setSelectedBuilding,
    loading,
  } = useBuildings();

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <div className="logo">
          <span>Bed Management System</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="building-selector">
          <span>Building:</span>

          <select
            value={selectedBuilding?.id || ''}
            onChange={(e) => {
              const found = buildings.find((b) => b.id === e.target.value);
              setSelectedBuilding(found || null);
            }}
            disabled={loading || buildings.length === 0}
          >
            {loading && <option>Loading...</option>}

            {!loading && buildings.length === 0 && (
              <option value="">No buildings yet</option>
            )}

            {!loading &&
              buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>

        <div
  className="admin"
  onClick={onAdminClick}
  title="Admin Panel"
  style={{ cursor: 'pointer' }}
>
  👤
</div>

        <button className="logout-button" title="Logout" onClick={onLogout}>
          ⏻
        </button>
      </div>
    </header>
  );
}

export default Header;