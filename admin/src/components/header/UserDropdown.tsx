import { useState } from "react";
import { useNavigate } from "react-router";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAuth } from "../../context/AuthContext";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleSignOut() {
    closeDropdown();
    logout();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="relative">
      <button onClick={toggleDropdown} className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400">
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-sm font-semibold text-white">
          {admin?.email?.[0]?.toUpperCase() ?? "A"}
        </span>
        <span className="mr-1 block font-medium text-theme-sm">{admin?.email ?? "Admin"}</span>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4.3125 8.65625L9 13.3437L13.6875 8.65625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <span className="block truncate text-theme-sm font-medium text-gray-700 dark:text-gray-400">{admin?.email}</span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">GymCrew Admin</span>
        </div>
        <ul className="flex flex-col gap-1 pt-3">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/admins"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Admin Management
            </DropdownItem>
          </li>
        </ul>
        <button
          onClick={handleSignOut}
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
