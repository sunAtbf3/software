import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLazySearchCustomersQuery } from "../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import { searchOfflineCustomerByMobile } from "../offline/billing/offlineCustomer.service";
import { getCustomerFromSearch } from "../utils/customerForm.utils";

/**
 * Search customer by 10-digit mobile (online API or offline IndexedDB).
 */
export function useCustomerSearch(mobileInput) {
    const isOnline = useSelector((state) => state.offline.isOnline);
    const [triggerSearch, { data: searchResults, isLoading, reset: resetSearch }] = useLazySearchCustomersQuery();
    const [offlineCustomer, setOfflineCustomer] = useState(null);
    const [offlineSearching, setOfflineSearching] = useState(false);

    useEffect(() => {
        if (mobileInput && mobileInput.length === 10) {
            if (!isOnline) {
                setOfflineSearching(true);
                searchOfflineCustomerByMobile(mobileInput)
                    .then((row) => setOfflineCustomer(row))
                    .finally(() => setOfflineSearching(false));
                return;
            }

            setOfflineCustomer(null);
            triggerSearch({ mobile: mobileInput });
        } else {
            setOfflineCustomer(null);
        }
    }, [mobileInput, triggerSearch, isOnline]);

    const foundCustomer = isOnline ? getCustomerFromSearch(searchResults) : offlineCustomer;
    const isSearching = isLoading || offlineSearching;

    const clearSearch = () => {
        resetSearch();
        setOfflineCustomer(null);
    };

    return {
        foundCustomer,
        isSearching,
        clearSearch,
    };
}
