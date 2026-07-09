import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransferNotifications } from "../../../hooks/useTransferNotifications";
import { formatAlertTime } from "../../../utils/transferNotifications/deriveTransferAlerts";

const Notification = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const { alerts, unreadCount, markSeen, markAllSeen } = useTransferNotifications();
    const visibleAlerts = alerts.filter((a) => a.unread);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const handleAlertClick = (alert) => {
        markSeen(alert.key);
        setIsOpen(false);

        const params = new URLSearchParams({
            tab: "transfers",
            ctab: alert.navigateTab,
        });
        if (alert.kind === "bulk") {
            params.set("openBulkId", alert.requestId);
        } else {
            params.set("openRequestId", alert.requestId);
        }
        navigate(`/dashboard?${params.toString()}`);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-600 rounded-full leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-300 rounded shadow-md z-50">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-800">Notifications</p>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllSeen}
                                className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-100"
                            >
                                {unreadCount} new · Mark all read
                            </button>
                        )}
                    </div>

                    <ul className="max-h-72 overflow-y-auto">
                        {visibleAlerts.length === 0 ? (
                            <li className="px-3 py-6 text-center text-xs text-gray-500">
                                No pending transfer alerts
                            </li>
                        ) : (
                            visibleAlerts.map((item) => (
                                <li key={item.key}>
                                    <button
                                        type="button"
                                        onClick={() => handleAlertClick(item)}
                                        className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                                            item.unread ? "bg-blue-50/40" : ""
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {item.unread && (
                                                <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-blue-600" />
                                            )}
                                            <div className={item.unread ? "" : "pl-3.5"}>
                                                <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                                                <p className="text-xs text-gray-600 mt-0.5 leading-snug">{item.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {formatAlertTime(item.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>

                    <div className="px-3 py-2 border-t border-gray-200 text-center">
                        <button
                            type="button"
                            className="text-xs text-blue-700 hover:text-blue-900"
                            onClick={() => setIsOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notification;
