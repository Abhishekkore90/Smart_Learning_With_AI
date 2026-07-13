import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Clock,
  Star,
  Layout,
  Target,
  HelpCircle,
  BookOpen,
  Award,
  Users,
  Utensils,
  BarChart3,
  Users2,
  Activity,
  Book,
  ClipboardCheck,
  Notebook,
  Settings,
  Bell,
  Edit3,
  FileText,
  BarChart,
  FolderOpen,
  Folder,
  Calendar as CalendarIcon,
  GraduationCap,
  Trophy,
  Music,
  Palette,
  Microscope,
  Flag,
  Apple,
  Sparkles,
  RefreshCw,
  ClipboardList,
  Package,
  FileSpreadsheet,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

interface SubItem {
  labelKey: string;
  to: string;
  icon?: React.ComponentType<any>;
  search?: Record<string, string>;
}

interface MenuItem {
  icon: React.ComponentType<any>;
  labelKey: string;
  to: string;
  subItems?: SubItem[];
}

const MENU_ITEMS: MenuItem[] = [
  { icon: LayoutDashboard, labelKey: "teacher_dashboard", to: "/teacher" },
  {
    icon: CalendarIcon,
    labelKey: "timetable_teacher",
    to: "/teacher/timetable",
  },
  { icon: Star, labelKey: "specialDay", to: "/teacher/modules/special-day" },
  {
    icon: Layout,
    labelKey: "templates",
    to: "/teacher/templates",
  },
  { icon: Target, labelKey: "planningQuestionBank", to: "/teacher/modules/annual-monthly-planning" },
  {
    icon: Notebook,
    labelKey: "teachingRecord",
    to: "/teacher/teaching-record",
  },
  { icon: FileSpreadsheet, labelKey: "results", to: "/teacher/result" },
  { icon: Users, labelKey: "monthlyMeeting", to: "/teacher/meeting" },
  { icon: Utensils, labelKey: "mdm", to: "/teacher/mdm" },
  { icon: FolderOpen, labelKey: "statsTeacher", to: "/teacher/stats-teacher" },
  { icon: GraduationCap, labelKey: "statsStudent", to: "/teacher/stats-student" },
  { icon: ClipboardCheck, labelKey: "sqaaf", to: "/teacher/sqaaf" },
];

export function TeacherSidebar() {
  const loc = useLocation();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang];
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      console.log("TeacherSidebar received toggle-teacher-sidebar event");
      setIsOpen((prev) => !prev);
    };
    window.addEventListener("toggle-teacher-sidebar", handleToggle);
    return () =>
      window.removeEventListener("toggle-teacher-sidebar", handleToggle);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const activeMenu = MENU_ITEMS.find((item) =>
      item.subItems?.some((sub) =>
        loc.pathname.startsWith(sub.to),
      ),
    );
    if (activeMenu) {
      if (!openMenus.includes(activeMenu.labelKey)) {
        setOpenMenus((prev) => [...prev, activeMenu.labelKey]);
      }
    }
  }, [loc.pathname]);

  const toggleMenu = (labelKey: string) => {
    setOpenMenus((prev) =>
      prev.includes(labelKey)
        ? prev.filter((m) => m !== labelKey)
        : [...prev, labelKey],
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`w-64 bg-white h-[calc(100vh-4rem)] fixed left-0 top-16 border-r border-slate-200 z-40 overflow-y-auto custom-scrollbar pt-4 pb-10 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <nav className="p-4 space-y-2">
          {MENU_ITEMS.map((item, idx) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpenMenu = openMenus.includes(item.labelKey);

            const isMenuCurrentlyActive = (() => {
              if (isOpenMenu) return true;
              return item.subItems?.some((sub) => {
                if (sub.search) {
                  return loc.pathname === sub.to && (loc.search as any).tab === sub.search.tab;
                }
                return loc.pathname === sub.to;
              });
            })();

            if (hasSubItems) {
              return (
                <div key={idx} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.labelKey)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[15px] transition-all shadow-sm ${isMenuCurrentlyActive
                        ? "bg-gradient-to-r from-[#0a081a] to-[#1e1b4b] text-[#818cf8] border-2 border-[#4f46e5]"
                        : "bg-[#1e1b4b] hover:bg-[#2e2a72] text-[#e0e7ff] border border-[#312e81]"
                      }`}
                  >
                    <div className="flex items-center justify-center text-current">
                      <item.icon className="size-6" strokeWidth={2} />
                    </div>
                    <span>{t[item.labelKey as keyof typeof t]}</span>
                  </button>

                  <AnimatePresence>
                    {isOpenMenu && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 mt-2"
                      >
                        {item.subItems?.map(
                          (sub, sidx) => (
                            <Link
                              key={sidx}
                              to={sub.to}
                              search={sub.search as any}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-[14px] text-[#312e81] bg-[#f0f2ff] border border-[#e0e7ff] hover:bg-[#e0e7ff] hover:border-[#c7d2fe] transition-all"
                              activeProps={{
                                style: {
                                  backgroundColor: "#1e1b4b",
                                  borderColor: "#4f46e5",
                                  color: "#ffffff",
                                  fontWeight: "bold",
                                  boxShadow: "0 4px 12px rgba(30, 27, 75, 0.3)",
                                }
                              }}
                            >
                              <div className="flex items-center justify-center text-current">
                                {sub.icon && (
                                  <sub.icon
                                    className="size-5"
                                    strokeWidth={2.5}
                                  />
                                )}
                              </div>
                              {t[sub.labelKey as keyof typeof t]}
                            </Link>
                          ),
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const isLinkActive = loc.pathname === item.to;

            return (
              <Link
                key={idx}
                to={item.to as any}
                activeOptions={{ exact: true }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[15px] transition-all hover:opacity-90 group shadow-sm ${isLinkActive
                    ? "bg-gradient-to-r from-[#0a081a] to-[#1e1b4b] text-[#818cf8] border-2 border-[#4f46e5]"
                    : "bg-[#1e1b4b] hover:bg-[#2e2a72] text-[#e0e7ff] border border-[#312e81]"
                  }`}
                activeProps={{
                  style: {
                    boxShadow: "0 4px 12px rgba(30, 27, 75, 0.3)",
                  },
                }}
              >
                <div className="flex items-center justify-center text-current group-hover:scale-110 transition-transform flex-shrink-0">
                  <item.icon className="size-6" strokeWidth={2} />
                </div>
                <span className="transition-colors truncate">
                  {t[item.labelKey as keyof typeof t]}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
