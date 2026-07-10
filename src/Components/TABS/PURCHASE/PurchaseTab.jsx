import React from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { PURCHASE_TAB_REGISTRY } from "./purchaseTabRegistry";
import { filterInternalTabsByRole } from "../../../Components/roles";
import { TRANSFER_BILLS_TAB_ID, getTransferBillsTabLabel } from "../../../constants/transferBillTabLabels";
import SubTabBar from "../../shared/SubTabBar";

const PurchaseTab = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useSelector((state) => state.auth);

    const filteredTabs = filterInternalTabsByRole("purchase", PURCHASE_TAB_REGISTRY).map((tab) =>
        tab.id === TRANSFER_BILLS_TAB_ID
            ? { ...tab, label: getTransferBillsTabLabel(user?.role) }
            : tab
    );
    const activeCtab = searchParams.get("ctab") || filteredTabs[0]?.id;
    const activeConfig = filteredTabs.find((t) => t.id === activeCtab) || filteredTabs[0];
    const SubComponent = activeConfig?.component ?? null;

    const handleTabClick = (tabId) => {
        setSearchParams({ tab: "purchase", ctab: tabId });
    };

    if (!filteredTabs.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-700">No purchase modules for your role</p>
                <p className="text-xs text-gray-400 mt-2">
                    Vendor purchases are handled at warehouse level. Record shop petty cash under Utilities → Petty Cash Book.
                </p>
            </div>
        );
    }

    return (
        <SubTabBar
            tabs={filteredTabs}
            activeTabId={activeCtab}
            onTabClick={handleTabClick}
            parentTabId="purchase"
        >
            {SubComponent
                ? <SubComponent />
                : <div className="app-loading">Sub-tab not found</div>
            }
        </SubTabBar>
    );
};

export default PurchaseTab;
