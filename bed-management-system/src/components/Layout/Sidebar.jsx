function Sidebar({ currentPage, setCurrentPage, isOpen, onClose }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "floors", label: "Floors" },
    { id: "rooms", label: "Rooms" },
    { id: "occupants", label: "Occupants" },
    { id: "payments", label: "Payments" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <>
      {/* Dim overlay — only visible on mobile when sidebar is open */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? "active" : ""}`}
              onClick={() => setCurrentPage(item.id)}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;