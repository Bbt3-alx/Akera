import {
  ArrowRightLeft,
  BarChart2,
  DollarSign,
  Handshake,
  List,
  Settings,
  TrendingUp,
  Users,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { AnimatePresence, color, motion } from "framer-motion";
import { Link } from "react-router-dom";

const SIDEBAR_ITEMS = [
  { name: "Overview", icon: BarChart2, color: "#6366F1", href: "/" },
  { name: "Users", icon: Users, color: "#EC4899", href: "/users" },
  { name: "Operations", icon: List, color: "#EC1899", href: "/operations" },
  { name: "USD", icon: DollarSign, color: "#10B981", href: "/dollar" },
  { name: "Partners", icon: Handshake, color: "#6ec7b7", href: "/partner" },
  {
    name: "Transactions",
    icon: ArrowRightLeft,
    color: "#EC4899",
    href: "/transactions",
  },
  { name: "Analytics", icon: TrendingUp, color: "#3b82f6", href: "/analytics" },
  { name: "Settings", icon: Settings, color: "#6ee7b7", href: "/setting" },
];

const SideBar = () => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);
  return (
    <motion.div
      className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${isSideBarOpen ? "w-64" : "w-20"}`}
      animate={{ width: isSideBarOpen ? 256 : 80 }}
    >
      <div className="h-full bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-gray-700">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSideBarOpen(!isSideBarOpen)}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit"
        >
          <Menu size={24} />
        </motion.button>
        <nav className="mt-8 flex-grow">
          {SIDEBAR_ITEMS.map((item, index) => (
            <Link key={(item, index)} to={item.href}>
              <motion.div className="flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2">
                <item.icon
                  size={22}
                  style={{ color: item.color, minWidth: "22px" }}
                />

                <AnimatePresence>
                  {isSideBarOpen && (
                    <motion.span
                      className="ml-4 whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, delay: 0.3 }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>
      </div>
    </motion.div>
  );
};

export default SideBar;
