// Utilities → Petty Cash Book — shop & warehouse petty-cash expenses (real API).

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Wallet } from "lucide-react";
import { ROLES } from "../../../roles";
import ShopExpensesTab from "../../PURCHASE/ShopExpensesTab/ShopExpensesTab";
import ExpensesTab from "../../PURCHASE/ExpensesTab/ExpensesTab";

const SHOP_ROLES = new Set([ROLES.SHOP_OWNER, ROLES.SHOP_MANAGER]);
const WH_ROLES = new Set([ROLES.WH_MANAGER, ROLES.WH_STOCK_LISTER]);

const PETTY_CASH_SUBTITLE = {
    shop: "Shop petty cash — repairs, utilities, stationery, transport (not customer sales)",
    warehouse: "Warehouse petty cash — rent, freight, labour, utilities (not inventory purchase)",
};

export default function PettyCashBookTab() {
    const { user } = useSelector((state) => state.auth);
    const role = user?.role;
    const isSuperAdmin = role === ROLES.SUPER_ADMIN;
    const isShopRole = SHOP_ROLES.has(role);
    const isWhRole = WH_ROLES.has(role);

    const defaultScope = useMemo(() => {
        if (isShopRole) return "shop";
        return "warehouse";
    }, [isShopRole]);

    const [scope, setScope] = useState(defaultScope);

    const showScopeToggle = isSuperAdmin;
    const activeScope = isSuperAdmin ? scope : defaultScope;

    const showShopPanel = activeScope === "shop" && (isSuperAdmin || isShopRole);
    const showWarehousePanel = activeScope === "warehouse" && (isSuperAdmin || isWhRole);

    return (
        <div className="space-y-4 bg-gray-50 min-h-screen px-1 py-1">
            {showScopeToggle && (
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Wallet size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 mr-2">Petty cash for</span>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setScope("shop")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                scope === "shop" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            Shop
                        </button>
                        <button
                            type="button"
                            onClick={() => setScope("warehouse")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                scope === "warehouse" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            Warehouse
                        </button>
                    </div>
                </div>
            )}

            {showShopPanel && (
                <ShopExpensesTab
                    title="Petty Cash Book"
                    subtitle={PETTY_CASH_SUBTITLE.shop}
                />
            )}

            {showWarehousePanel && (
                <ExpensesTab
                    title="Petty Cash Book"
                    subtitle={PETTY_CASH_SUBTITLE.warehouse}
                />
            )}

            {!showShopPanel && !showWarehousePanel && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
                    Petty cash book is not available for your role.
                </div>
            )}
        </div>
    );
}
