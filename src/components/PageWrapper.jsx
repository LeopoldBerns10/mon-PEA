import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function PageWrapper({ children }) {
  return (
    <div className="min-h-screen bg-bg-root">
      <Sidebar />
      <div className="md:ml-16 pb-20 md:pb-0 min-h-screen">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
