// frontend/src/components/SideNav.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Radio, User } from "lucide-react";

export default function SideNav() {
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
    <nav className="flex flex-col p-4 space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-base transition-all duration-200 group w-full text-left ${
              item.active
                ? "text-rose-600 bg-rose-50 font-bold shadow-sm shadow-rose-100/50"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
            }`}
          >
            <Icon
              className={`w-6 h-6 transition-colors ${
                item.active ? "stroke-[2.5px]" : "group-hover:text-rose-500"
              }`}
            />
            <span className="flex-1">{item.name}</span>

            {/* Active Indicator */}
            {item.active && (
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-fade-in" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
