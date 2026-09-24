import { NavLink, Route, Routes } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import HomePage from './pages/HomePage'
import MealEditorPage from './pages/MealEditorPage'
import BodyPage from './pages/BodyPage'
import ChartsPage from './pages/ChartsPage'
import SettingsPage from './pages/SettingsPage'

const TABS = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/body', label: '体・運動', icon: '⚖️' },
  { to: '/charts', label: 'グラフ', icon: '📈' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  useRegisterSW({ immediate: true })

  return (
    <div className="app">
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meal/new" element={<MealEditorPage />} />
          <Route path="/meal/:id" element={<MealEditorPage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
