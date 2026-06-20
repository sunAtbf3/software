// src/Components/SideBarDashboard/SideBarDashboard.jsx
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TAB_REGISTRY } from "../TabRegistry";
import { ROLE_PERMISSIONS, ROLE_LABELS, ROLES, filterSubItemsByRole } from "../roles";
import { useLogoutMutation } from "../../REDUX_FEATURES/REDUX_SLICES/Login_Api/authApi";
import {
    clearCredentials,
    setAuthChecked,
} from "../../REDUX_FEATURES/REDUX_SLICES/Login_Api/authSlice";
import AppLoading from "../shared/AppLoading";
import Notification from "../shared/notification/Notification";
import OfflineStatusBar from "../../offline/components/OfflineStatusBar";
import { resetOfflineDb, metaRepository } from "../../offline";
import ThemeColorTool from "../ThemeColorTool";
import RealLogo from "../../assets/BizCentro.png";
import BizCentroIcon from "../../assets/icon.png";

const getRoleInitials = (roleName) => {
    if (!roleName) return "?";
    return roleName
        .split(/[_\s]+/)
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

const SIDEBAR_NAV_FOCUS = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:ring-offset-0";
const SIDEBAR_NAV = {
    active: `text-white font-medium border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
    idle: `text-white hover:text-white border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
    subActive: `bg-white/[0.08] text-white font-medium ${SIDEBAR_NAV_FOCUS}`,
    subIdle: `text-white hover:bg-white/[0.05] hover:text-white ${SIDEBAR_NAV_FOCUS}`,
};

const SideBarDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const [logout, { isLoading: isLogoutLoading }] = useLogoutMutation();

    const activeRole = user?.role || ROLES.SUPER_ADMIN;
    const locationId = user?.warehouse_id || user?.shop_id || "";
    const allowedTabIds = ROLE_PERMISSIONS[activeRole] || [];
    const allowedTabs = TAB_REGISTRY.filter((tab) => allowedTabIds.includes(tab.id));
    const defaultTab = allowedTabs[0]?.id || "dashboard";

    const tabFromUrl = searchParams.get("tab");
    const activeTab = tabFromUrl && allowedTabIds.includes(tabFromUrl)
        ? tabFromUrl
        : defaultTab;

    const activeCtab = searchParams.get("ctab") || null;

    const [expandedTab, setExpandedTab] = useState(() => {
        const initialTab = new URLSearchParams(window.location.search).get("tab");
        const entry = allowedTabs.find((t) => t.id === initialTab && t.subItems?.length);
        return entry ? entry.id : null;
    });

    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

    useEffect(() => {
        const updateIndicator = () => {
            const activeBtn = document.getElementById(`sidebar-btn-${activeTab}`);
            const navContainer = document.getElementById("sidebar-nav-container");
            if (activeBtn && navContainer) {
                setIndicatorStyle({
                    top: activeBtn.offsetTop,
                    height: activeBtn.offsetHeight,
                    opacity: 1
                });
            } else {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
            }
        };

        updateIndicator();
        const timer = setTimeout(updateIndicator, 100);
        return () => clearTimeout(timer);
    }, [activeTab, expandedTab, isExpanded]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const urlTab = searchParams.get("tab");
        const urlIsWrong = !urlTab || !allowedTabIds.includes(urlTab);

        if (urlIsWrong) {
            setSearchParams({ tab: defaultTab }, { replace: true });
        }
    }, [activeRole, locationId, searchParams, setSearchParams, defaultTab, allowedTabIds]);

    const handleTabClick = (tab) => {
        if (!allowedTabIds.includes(tab.id)) return;

        const hasSubItems = tab.subItems?.length > 0;
        const isCurrentlyExpanded = expandedTab === tab.id;

        if (hasSubItems) {
            if (isCurrentlyExpanded) {
                setExpandedTab(null);
                setSearchParams({ tab: tab.id });
            } else {
                setExpandedTab(tab.id);
                const firstSub = tab.subItems[0];
                setSearchParams({ tab: tab.id, ctab: firstSub.id });
            }
        } else {
            setExpandedTab(null);
            setSearchParams({ tab: tab.id });
        }

        if (window.innerWidth < 768) {
            setIsMobileMenuOpen(false);
        }
    };

    const handleSubItemClick = (parentId, subId) => {
        if (!allowedTabIds.includes(parentId)) return;
        setExpandedTab(parentId);
        setSearchParams({ tab: parentId, ctab: subId });

        if (window.innerWidth < 768) {
            setIsMobileMenuOpen(false);
        }
    };

    const handleSwitchTab = (tabId) => {
        const tab = allowedTabs.find((t) => t.id === tabId);
        if (tab) handleTabClick(tab);
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch (_error) {
            // Clear local session even if backend logout fails.
        } finally {
            await resetOfflineDb().catch(() => { });
            await metaRepository.clearOfflineSession().catch(() => { });
            dispatch(clearCredentials());
            dispatch(setAuthChecked(true));
            setSearchParams({}, { replace: true });
        }
    };

    const activeTabConfig = allowedTabs.find((t) => t.id === activeTab);
    const activeSubItem = activeTabConfig?.subItems?.find((s) => s.id === activeCtab);
    const TabComponent = (activeCtab && activeSubItem?.component)
        ? activeSubItem.component
        : activeTabConfig?.component ?? null;

    const activeSubLabel = activeSubItem?.label;
    const headerTitle = activeSubLabel
        ? `${activeTabConfig?.label || "Dashboard"} / ${activeSubLabel}`
        : activeTabConfig?.label || "Dashboard";

    return (
        <div className="relative min-h-screen bg-app-bg overflow-hidden flex h-screen">

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className={`
                    fixed left-0 top-0 h-screen z-50
                    flex flex-col shrink-0 bg-app-sidebar border-r border-slate-700
                    overflow-hidden
                    ${isMobileMenuOpen ? "left-0" : "-left-full md:left-0"}
                `}
                style={{
                    width: isExpanded ? "240px" : "64px",
                    transition: "width 250ms ease"
                }}
            >
                <div className="relative shrink-0 border-b border-slate-700 px- py-3">
                    <div
                        className={`flex items-center justify-center w-full overflow-hidden bg-app-sidebar transition-all duration-200 ${isExpanded ? "h-24" : "h-12"
                            }`}
                    >
                        <img
                            src={isExpanded ? RealLogo : BizCentroIcon}
                            alt="BizCentro"
                            className={`block object-contain object-center transition-all duration-200 ${isExpanded ? "w-full h-full" : "w-18 h-18"
                                }`}
                        />
                    </div>

                    {isExpanded ? (
                        <div className="mt-2 text-center animate-fade-in">
                            <span className="inline-block px-2 py-0.5 text-[10px] rounded text-white bg-white/[0.06] border border-white/10 whitespace-nowrap">
                                {ROLE_LABELS[activeRole] || activeRole}
                            </span>
                        </div>
                    ) : (
                        <div className="mt-2 flex justify-center animate-fade-in" title={ROLE_LABELS[activeRole] || activeRole}>
                            <div className="w-7 h-7 rounded-full bg-white/[0.06] text-white border border-white/10 flex items-center justify-center text-[10px] font-bold shadow-sm">
                                {getRoleInitials(ROLE_LABELS[activeRole] || activeRole)}
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 min-h-0 px-2 py-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div id="sidebar-nav-container" className="flex flex-col gap-2 relative">
                        {/* Smooth active selection indicator overlay */}
                        <div
                            style={{
                                transform: `translateY(${indicatorStyle.top}px)`,
                                height: `${indicatorStyle.height}px`,
                                opacity: indicatorStyle.opacity,
                                transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease"
                            }}
                            className="absolute left-0 right-0 bg-white/[0.08] border-l-[3px] border-white/50 rounded-r pointer-events-none z-0"
                        />
                        {allowedTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const hasSubItems = tab.subItems?.length > 0;
                            const isTabExpanded = expandedTab === tab.id;

                            return (
                                <div
                                    key={tab.id}
                                    className={`flex flex-col min-w-0 ${isTabExpanded && isExpanded ? "pb-1.5" : ""}`}
                                >
                                    <button
                                        id={`sidebar-btn-${tab.id}`}
                                        type="button"
                                        onClick={() => handleTabClick(tab)}
                                        className={`
                                            w-full flex items-center gap-3 min-w-0 rounded text-base leading-normal
                                            px-4 py-3 cursor-pointer overflow-hidden z-10 relative
                                            ${isActive ? SIDEBAR_NAV.active : SIDEBAR_NAV.idle}
                                        `}
                                    >
                                        <svg
                                            className="w-4 h-4 shrink-0 min-w-[24px] transition-colors duration-150 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
                                        </svg>
                                        <span
                                            style={{
                                                opacity: isExpanded ? 1 : 0,
                                                transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
                                                transition: 'opacity 200ms ease, transform 200ms ease',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                            }}
                                            className="flex-1 min-w-0 text-left truncate leading-normal"
                                        >
                                            {tab.label}
                                        </span>
                                        {hasSubItems && isExpanded && (
                                            <svg
                                                className={`w-3 h-3 shrink-0 ml-0.5 transition-transform duration-200 ${isTabExpanded ? "rotate-180" : ""}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {hasSubItems && isExpanded && isTabExpanded && (
                                        <div className="mt-1 ml-4 pl-2 border-l border-slate-700 flex flex-col gap-1 min-w-0">
                                            {filterSubItemsByRole(tab.id, tab.subItems).map((sub) => {
                                                const isSubActive = isActive && activeCtab === sub.id;
                                                return (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={() => handleSubItemClick(tab.id, sub.id)}
                                                        className={`
                                                            w-full min-w-0 flex items-center px-4 py-2 text-sm text-left rounded truncate leading-normal cursor-pointer overflow-hidden
                                                            ${isSubActive ? SIDEBAR_NAV.subActive : SIDEBAR_NAV.subIdle}
                                                        `}
                                                    >
                                                        <span
                                                            style={{
                                                                opacity: isExpanded ? 1 : 0,
                                                                transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
                                                                transition: 'opacity 200ms ease, transform 200ms ease',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                            }}
                                                            className="truncate block w-full"
                                                        >
                                                            {sub.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <div className="p-2 shrink-0 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLogoutLoading}
                        title="Logout"
                        className={`
                            w-full mb-2 text-sm rounded disabled:opacity-50
                            text-red-300 bg-slate-900 border border-red-900/60 hover:bg-red-950/40
                            flex items-center justify-center gap-3 cursor-pointer overflow-hidden
                            ${isExpanded ? "px-3 py-2" : "px-2 py-3"}
                        `}
                    >
                        <svg
                            className="w-4 h-4 shrink-0 min-w-[20px]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        <span
                            style={{
                                opacity: isExpanded ? 1 : 0,
                                transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
                                transition: 'opacity 200ms ease, transform 200ms ease',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                            }}
                        >
                            Logout
                        </span>
                    </button>
                    <div
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            transform: isExpanded ? 'translateY(0)' : 'translateY(-4px)',
                            transition: 'opacity 200ms ease, transform 200ms ease',
                            height: isExpanded ? 'auto' : '0px',
                            overflow: 'hidden'
                        }}
                    >
                        <p className="text-[10px] text-center text-white whitespace-nowrap">BizCentro v1.0.0</p>
                    </div>
                </div>
            </aside>

            <main className="ml-16 flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden h-screen">
                <header className="bg-white h-11 border-b border-gray-300 flex items-center justify-between px-4 shrink-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={toggleMobileMenu}
                            className="md:hidden p-1.5 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h2 className="text-sm font-semibold text-gray-800 truncate">{headerTitle}</h2>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                        <OfflineStatusBar />
                        {user?.name && <span className="hidden sm:inline">{user.name}</span>}
                        <Notification />
                    </div>
                </header>

                <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden">
                    <Suspense fallback={<AppLoading />}>
                        {TabComponent ? (
                            <TabComponent onSwitchTab={handleSwitchTab} />
                        ) : (
                            <div className="bg-white border border-gray-300 rounded p-6 text-center text-gray-500">
                                <p className="text-sm">This section is coming soon.</p>
                            </div>
                        )}
                    </Suspense>
                </div>
            </main>
            <ThemeColorTool />
        </div>
    );
};

export default SideBarDashboard;

// // src/Components/SideBarDashboard/SideBarDashboard.jsx
// import React, { useState, useEffect, Suspense } from "react";
// import { useSearchParams } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { TAB_REGISTRY } from "../TabRegistry";
// import { ROLE_PERMISSIONS, ROLE_LABELS, ROLES, filterSubItemsByRole } from "../roles";
// import { useLogoutMutation } from "../../REDUX_FEATURES/REDUX_SLICES/Login_Api/authApi";
// import {
//     clearCredentials,
//     setAuthChecked,
// } from "../../REDUX_FEATURES/REDUX_SLICES/Login_Api/authSlice";
// import AppLoading from "../shared/AppLoading";
// import Notification from "../shared/notification/Notification";
// import OfflineStatusBar from "../../offline/components/OfflineStatusBar";
// import { resetOfflineDb, metaRepository } from "../../offline";
// import ThemeColorTool from "../ThemeColorTool";

// // import RealLogo from "../../assets/BizCentro.png";

// const LOGO = "/bigfeathers-logo-cropped.png";

// const getRoleInitials = (roleName) => {
//     if (!roleName) return "?";
//     return roleName
//         .split(/[_\s]+/)
//         .map(word => word[0])
//         .join("")
//         .toUpperCase()
//         .slice(0, 2);
// };

// const SIDEBAR_NAV_FOCUS = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:ring-offset-0";
// const SIDEBAR_NAV = {
//     active: `text-white font-medium border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
//     idle: `text-white hover:text-white border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
//     subActive: `bg-white/[0.08] text-white font-medium ${SIDEBAR_NAV_FOCUS}`,
//     subIdle: `text-white hover:bg-white/[0.05] hover:text-white ${SIDEBAR_NAV_FOCUS}`,
// };

// const SideBarDashboard = () => {
//     const [searchParams, setSearchParams] = useSearchParams();
//     const [isExpanded, setIsExpanded] = useState(false);
//     const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//     const dispatch = useDispatch();
//     const user = useSelector((state) => state.auth.user);
//     const [logout, { isLoading: isLogoutLoading }] = useLogoutMutation();

//     const activeRole = user?.role || ROLES.SUPER_ADMIN;
//     const locationId = user?.warehouse_id || user?.shop_id || "";
//     const allowedTabIds = ROLE_PERMISSIONS[activeRole] || [];
//     const allowedTabs = TAB_REGISTRY.filter((tab) => allowedTabIds.includes(tab.id));
//     const defaultTab = allowedTabs[0]?.id || "dashboard";

//     const tabFromUrl = searchParams.get("tab");
//     const activeTab = tabFromUrl && allowedTabIds.includes(tabFromUrl)
//         ? tabFromUrl
//         : defaultTab;

//     const activeCtab = searchParams.get("ctab") || null;

//     const [expandedTab, setExpandedTab] = useState(() => {
//         const initialTab = new URLSearchParams(window.location.search).get("tab");
//         const entry = allowedTabs.find((t) => t.id === initialTab && t.subItems?.length);
//         return entry ? entry.id : null;
//     });

//     const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

//     useEffect(() => {
//         const updateIndicator = () => {
//             const activeBtn = document.getElementById(`sidebar-btn-${activeTab}`);
//             const navContainer = document.getElementById("sidebar-nav-container");
//             if (activeBtn && navContainer) {
//                 setIndicatorStyle({
//                     top: activeBtn.offsetTop,
//                     height: activeBtn.offsetHeight,
//                     opacity: 1
//                 });
//             } else {
//                 setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
//             }
//         };

//         updateIndicator();
//         const timer = setTimeout(updateIndicator, 100);
//         return () => clearTimeout(timer);
//     }, [activeTab, expandedTab, isExpanded]);

//     useEffect(() => {
//         const handleResize = () => {
//             if (window.innerWidth >= 768) {
//                 setIsMobileMenuOpen(false);
//             }
//         };
//         window.addEventListener("resize", handleResize);
//         return () => window.removeEventListener("resize", handleResize);
//     }, []);

//     useEffect(() => {
//         const urlTab = searchParams.get("tab");
//         const urlIsWrong = !urlTab || !allowedTabIds.includes(urlTab);

//         if (urlIsWrong) {
//             setSearchParams({ tab: defaultTab }, { replace: true });
//         }
//     }, [activeRole, locationId, searchParams, setSearchParams, defaultTab, allowedTabIds]);

//     const handleTabClick = (tab) => {
//         if (!allowedTabIds.includes(tab.id)) return;

//         const hasSubItems = tab.subItems?.length > 0;
//         const isCurrentlyExpanded = expandedTab === tab.id;

//         if (hasSubItems) {
//             if (isCurrentlyExpanded) {
//                 setExpandedTab(null);
//                 setSearchParams({ tab: tab.id });
//             } else {
//                 setExpandedTab(tab.id);
//                 const firstSub = tab.subItems[0];
//                 setSearchParams({ tab: tab.id, ctab: firstSub.id });
//             }
//         } else {
//             setExpandedTab(null);
//             setSearchParams({ tab: tab.id });
//         }

//         if (window.innerWidth < 768) {
//             setIsMobileMenuOpen(false);
//         }
//     };

//     const handleSubItemClick = (parentId, subId) => {
//         if (!allowedTabIds.includes(parentId)) return;
//         setExpandedTab(parentId);
//         setSearchParams({ tab: parentId, ctab: subId });

//         if (window.innerWidth < 768) {
//             setIsMobileMenuOpen(false);
//         }
//     };

//     const handleSwitchTab = (tabId) => {
//         const tab = allowedTabs.find((t) => t.id === tabId);
//         if (tab) handleTabClick(tab);
//     };

//     const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

//     const handleLogout = async () => {
//         try {
//             await logout().unwrap();
//         } catch (_error) {
//             // Clear local session even if backend logout fails.
//         } finally {
//             await resetOfflineDb().catch(() => { });
//             await metaRepository.clearOfflineSession().catch(() => { });
//             dispatch(clearCredentials());
//             dispatch(setAuthChecked(true));
//             setSearchParams({}, { replace: true });
//         }
//     };

//     const activeTabConfig = allowedTabs.find((t) => t.id === activeTab);
//     const activeSubItem = activeTabConfig?.subItems?.find((s) => s.id === activeCtab);
//     const TabComponent = (activeCtab && activeSubItem?.component)
//         ? activeSubItem.component
//         : activeTabConfig?.component ?? null;

//     const activeSubLabel = activeSubItem?.label;
//     const headerTitle = activeSubLabel
//         ? `${activeTabConfig?.label || "Dashboard"} / ${activeSubLabel}`
//         : activeTabConfig?.label || "Dashboard";

//     return (
//         <div className="relative min-h-screen bg-app-bg overflow-hidden flex h-screen">

//             {isMobileMenuOpen && (
//                 <div
//                     className="fixed inset-0 bg-black/30 z-30 md:hidden"
//                     onClick={() => setIsMobileMenuOpen(false)}
//                 />
//             )}

//             <aside
//                 onMouseEnter={() => setIsExpanded(true)}
//                 onMouseLeave={() => setIsExpanded(false)}
//                 className={`
//                     fixed left-0 top-0 h-screen z-50
//                     flex flex-col shrink-0 bg-app-sidebar border-r border-slate-700
//                     overflow-hidden
//                     ${isMobileMenuOpen ? "left-0" : "-left-full md:left-0"}
//                 `}
//                 style={{
//                     width: isExpanded ? "240px" : "64px",
//                     transition: "width 250ms ease"
//                 }}
//             >
//                 <div className="relative shrink-0 border-b border-slate-700 px-2 py-3">
//                     <div
//                         className={`flex items-center justify-center w-full overflow-hidden bg-app-sidebar transition-all duration-200 ${isExpanded ? "h-14" : "h-10"
//                             }`}
//                     >
//                         <img
//                             src={isExpanded ? LOGO : "/favicon.svg"}
//                             alt="BigFeathers"
//                             className={`block object-contain object-center transition-all duration-200 ${isExpanded ? "w-full h-full" : "w-7 h-7"
//                                 }`}
//                         />
//                     </div>

//                     {isExpanded ? (
//                         <div className="mt-2 text-center animate-fade-in">
//                             <span className="inline-block px-2 py-0.5 text-[10px] rounded text-white bg-white/[0.06] border border-white/10 whitespace-nowrap">
//                                 {ROLE_LABELS[activeRole] || activeRole}
//                             </span>
//                         </div>
//                     ) : (
//                         <div className="mt-2 flex justify-center animate-fade-in" title={ROLE_LABELS[activeRole] || activeRole}>
//                             <div className="w-7 h-7 rounded-full bg-white/[0.06] text-white border border-white/10 flex items-center justify-center text-[10px] font-bold shadow-sm">
//                                 {getRoleInitials(ROLE_LABELS[activeRole] || activeRole)}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <nav className="flex-1 min-h-0 px-2 py-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
//                     <div id="sidebar-nav-container" className="flex flex-col gap-2 relative">
//                         {/* Smooth active selection indicator overlay */}
//                         <div
//                             style={{
//                                 transform: `translateY(${indicatorStyle.top}px)`,
//                                 height: `${indicatorStyle.height}px`,
//                                 opacity: indicatorStyle.opacity,
//                                 transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease"
//                             }}
//                             className="absolute left-0 right-0 bg-white/[0.08] border-l-[3px] border-white/50 rounded-r pointer-events-none z-0"
//                         />
//                         {allowedTabs.map((tab) => {
//                             const isActive = activeTab === tab.id;
//                             const hasSubItems = tab.subItems?.length > 0;
//                             const isTabExpanded = expandedTab === tab.id;

//                             return (
//                                 <div
//                                     key={tab.id}
//                                     className={`flex flex-col min-w-0 ${isTabExpanded && isExpanded ? "pb-1.5" : ""}`}
//                                 >
//                                     <button
//                                         id={`sidebar-btn-${tab.id}`}
//                                         type="button"
//                                         onClick={() => handleTabClick(tab)}
//                                         className={`
//                                             w-full flex items-center gap-3 min-w-0 rounded text-base leading-normal
//                                             px-4 py-3 cursor-pointer overflow-hidden z-10 relative
//                                             ${isActive ? SIDEBAR_NAV.active : SIDEBAR_NAV.idle}
//                                         `}
//                                     >
//                                         <svg
//                                             className="w-4 h-4 shrink-0 min-w-[24px] transition-colors duration-150 text-white"
//                                             fill="none"
//                                             stroke="currentColor"
//                                             viewBox="0 0 24 24"
//                                         >
//                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
//                                         </svg>
//                                         <span
//                                             style={{
//                                                 opacity: isExpanded ? 1 : 0,
//                                                 transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
//                                                 transition: 'opacity 200ms ease, transform 200ms ease',
//                                                 whiteSpace: 'nowrap',
//                                                 overflow: 'hidden',
//                                             }}
//                                             className="flex-1 min-w-0 text-left truncate leading-normal"
//                                         >
//                                             {tab.label}
//                                         </span>
//                                         {hasSubItems && isExpanded && (
//                                             <svg
//                                                 className={`w-3 h-3 shrink-0 ml-0.5 transition-transform duration-200 ${isTabExpanded ? "rotate-180" : ""}`}
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                                             </svg>
//                                         )}
//                                     </button>

//                                     {hasSubItems && isExpanded && isTabExpanded && (
//                                         <div className="mt-1 ml-4 pl-2 border-l border-slate-700 flex flex-col gap-1 min-w-0">
//                                             {filterSubItemsByRole(tab.id, tab.subItems).map((sub) => {
//                                                 const isSubActive = isActive && activeCtab === sub.id;
//                                                 return (
//                                                     <button
//                                                         key={sub.id}
//                                                         type="button"
//                                                         onClick={() => handleSubItemClick(tab.id, sub.id)}
//                                                         className={`
//                                                             w-full min-w-0 flex items-center px-4 py-2 text-sm text-left rounded truncate leading-normal cursor-pointer overflow-hidden
//                                                             ${isSubActive ? SIDEBAR_NAV.subActive : SIDEBAR_NAV.subIdle}
//                                                         `}
//                                                     >
//                                                         <span
//                                                             style={{
//                                                                 opacity: isExpanded ? 1 : 0,
//                                                                 transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
//                                                                 transition: 'opacity 200ms ease, transform 200ms ease',
//                                                                 whiteSpace: 'nowrap',
//                                                                 overflow: 'hidden',
//                                                             }}
//                                                             className="truncate block w-full"
//                                                         >
//                                                             {sub.label}
//                                                         </span>
//                                                     </button>
//                                                 );
//                                             })}
//                                         </div>
//                                     )}
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 </nav>

//                 <div className="p-2 shrink-0 border-t border-slate-700">
//                     <button
//                         type="button"
//                         onClick={handleLogout}
//                         disabled={isLogoutLoading}
//                         title="Logout"
//                         className={`
//                             w-full mb-2 text-sm rounded disabled:opacity-50
//                             text-red-300 bg-slate-900 border border-red-900/60 hover:bg-red-950/40
//                             flex items-center justify-center gap-3 cursor-pointer overflow-hidden
//                             ${isExpanded ? "px-3 py-2" : "px-2 py-3"}
//                         `}
//                     >
//                         <svg
//                             className="w-4 h-4 shrink-0 min-w-[20px]"
//                             fill="none"
//                             stroke="currentColor"
//                             viewBox="0 0 24 24"
//                         >
//                             <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 strokeWidth={1.8}
//                                 d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
//                             />
//                         </svg>
//                         <span
//                             style={{
//                                 opacity: isExpanded ? 1 : 0,
//                                 transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
//                                 transition: 'opacity 200ms ease, transform 200ms ease',
//                                 whiteSpace: 'nowrap',
//                                 overflow: 'hidden',
//                             }}
//                         >
//                             Logout
//                         </span>
//                     </button>
//                     <div
//                         style={{
//                             opacity: isExpanded ? 1 : 0,
//                             transform: isExpanded ? 'translateY(0)' : 'translateY(-4px)',
//                             transition: 'opacity 200ms ease, transform 200ms ease',
//                             height: isExpanded ? 'auto' : '0px',
//                             overflow: 'hidden'
//                         }}
//                     >
//                         <p className="text-[10px] text-center text-white whitespace-nowrap">BizCentro v1.0.0</p>
//                     </div>
//                 </div>
//             </aside>

//             <main className="ml-16 flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden h-screen">
//                 <header className="bg-white h-11 border-b border-gray-300 flex items-center justify-between px-4 shrink-0 z-10">
//                     <div className="flex items-center gap-3 min-w-0">
//                         <button
//                             type="button"
//                             onClick={toggleMobileMenu}
//                             className="md:hidden p-1.5 border border-gray-300 rounded hover:bg-gray-50"
//                         >
//                             <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//                             </svg>
//                         </button>
//                         <h2 className="text-sm font-semibold text-gray-800 truncate">{headerTitle}</h2>
//                     </div>

//                     <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
//                         <OfflineStatusBar />
//                         {user?.name && <span className="hidden sm:inline">{user.name}</span>}
//                         <Notification />
//                     </div>
//                 </header>

//                 <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden">
//                     <Suspense fallback={<AppLoading />}>
//                         {TabComponent ? (
//                             <TabComponent onSwitchTab={handleSwitchTab} />
//                         ) : (
//                             <div className="bg-white border border-gray-300 rounded p-6 text-center text-gray-500">
//                                 <p className="text-sm">This section is coming soon.</p>
//                             </div>
//                         )}
//                     </Suspense>
//                 </div>
//             </main>
//             <ThemeColorTool />
//         </div>
//     );
// };

// export default SideBarDashboard;
