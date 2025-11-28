// frontend/src/components/BottomNav.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Radio, User } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const navItems = [
    {
      name: "홈",
      icon: Home,
      path: "/home",
      active: pathname === "/home" || pathname === "/",
    },
    {
      name: "블라블라",
      icon: MessageCircle,
      path: "/ai-talk",
      active: pathname.startsWith("/ai-talk"),
    },
    {
      name: "보이스룸",
      icon: Radio,
      path: "/voiceroom",
      active: pathname.startsWith("/voiceroom"),
    },
    {
      name: "내 정보",
      icon: User,
      path: "/my",
      active: pathname.startsWith("/my"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 w-full bg-white/90 backdrop-blur-lg 
                 border-t border-gray-100
                 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] 
                 z-50 pb-[env(safe-area-inset-bottom)] transition-all duration-300"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 active:scale-95 rounded-xl ${
                item.active
                  ? "text-rose-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 transition-transform duration-300 ${
                  item.active ? "scale-110 stroke-[2.5px]" : "stroke-2"
                }`}
              />
              <span
                className={`text-[10px] transition-all ${
                  item.active
                    ? "font-bold opacity-100"
                    : "font-medium opacity-80"
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
