import React from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { TRANSFERS_TAB_REGISTRY } from "./transfersTabRegistry";
import { filterInternalTabsByRole } from "../../../Components/roles";
import SubTabBar from "../../shared/SubTabBar";

const resolveTabLabel = (tab, role) => {
    if (tab?.labelByRole && role && tab.labelByRole[role]) {
        return tab.labelByRole[role];
    }
    return tab?.label;
};

const TransfersDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const role = useSelector((state) => state.auth?.user?.role);

    const filteredTabs = filterInternalTabsByRole("transfers", TRANSFERS_TAB_REGISTRY).map((tab) => ({
        ...tab,
        label: resolveTabLabel(tab, role),
    }));
    const activeCtab = searchParams.get("ctab") || filteredTabs[0]?.id;
    const activeConfig = filteredTabs.find(t => t.id === activeCtab) || filteredTabs[0];
    const SubComponent = activeConfig?.component ?? null;

    const handleTabClick = (tabId) => {
        setSearchParams({ tab: "transfers", ctab: tabId });
    };

    return (
        <SubTabBar
            tabs={filteredTabs}
            activeTabId={activeCtab}
            onTabClick={handleTabClick}
            parentTabId="transfers"
        >
            {SubComponent
                ? <SubComponent />
                : <div className="app-loading">Sub-tab not found</div>
            }
        </SubTabBar>
    );
};

export default TransfersDashboard;
