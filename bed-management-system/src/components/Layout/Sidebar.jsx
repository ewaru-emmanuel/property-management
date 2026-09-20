function Sidebar({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "floors", label: "Floors" },
    { id: "rooms", label: "Rooms" },
    { id: "occupants", label: "Occupants" },
    { id: "payments", label: "Payments" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      
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
  );
}

export default Sidebar;