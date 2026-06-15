import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../REDUX_SLICES/Login_Api/authSlice";
import { authApi } from "../REDUX_SLICES/Login_Api/authApi";
import { vendorApi } from "../REDUX_SLICES/Vendor_api/vendorApi";
import vendorReducer from "../REDUX_SLICES/Vendor_api/vendorSlice";
import { warehouseApi } from "../REDUX_SLICES/Warehouse_api/warehouseApi";
import warehouseReducer from "../REDUX_SLICES/Warehouse_api/warehouseSlice";
import { userApi } from "../REDUX_SLICES/User_Api/userApi";
import userReducer from "../REDUX_SLICES/User_Api/userSlice";
import { inwardApi } from "../REDUX_SLICES/Inward_api/inwardApi";
import inwardReducer from "../REDUX_SLICES/Inward_api/inwardSlice";
import { categoryApi } from "../REDUX_SLICES/Category_api/categoryApi";
import categoryReducer from "../REDUX_SLICES/Category_api/categorySlice";
import productReducer from "../REDUX_SLICES/Product_api/productSlice";
import { productApi } from "../REDUX_SLICES/Product_api/productApi";
import { bulkUploadApi } from "../REDUX_SLICES/BulkUpload_api/bulkUploadApi";
import bulkUploadReducer from "../REDUX_SLICES/BulkUpload_api/bulkUploadSlice";
import { stockApi } from "../REDUX_SLICES/Stock_api/stockApi";
import stockReducer from "../REDUX_SLICES/Stock_api/stockSlice";
import { purchaseApi } from "../REDUX_SLICES/Purchase_api/purchaseApi";
import { purchaseFinanceApi } from "../REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import purchaseReducer from "../REDUX_SLICES/Purchase_api/purchaseSlice";
import { shopApi } from "../REDUX_SLICES/Shop_api/shopApi";
import shopReducer from "../REDUX_SLICES/Shop_api/shopSlice";
import { transferApi } from "../REDUX_SLICES/Transfer_api/transferApi";
import transferReducer from "../REDUX_SLICES/Transfer_api/transferSlice";
import { shopStockApi } from "../REDUX_SLICES/ShopStock_api/shopStockApi";
import shopStockReducer from "../REDUX_SLICES/ShopStock_api/shopStockSlice";
import { transferRequestApi } from "../REDUX_SLICES/TransferRequest_api/transferRequestApi";
import transferRequestReducer from "../REDUX_SLICES/TransferRequest_api/transferRequestSlice";

import { stockSearchApi } from "../REDUX_SLICES/StockSearch_api/stockSearchApi";
import stockSearchReducer from "../REDUX_SLICES/StockSearch_api/stockSearchSlice";
import { shopLevelsApi } from "../REDUX_SLICES/ShopLevels_api/shopLevelsApi";
import shopLevelsReducer from "../REDUX_SLICES/ShopLevels_api/shopLevelsSlice";
import { bulkTransferApi } from "../REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import bulkTransferReducer from "../REDUX_SLICES/BulkTransfer_api/bulkTransferSlice";
import { shopWarehouseCatalogApi } from "../REDUX_SLICES/ShopWarehouseCatalog_api/shopWarehouseCatalogApi";
import { warehousePeerCatalogApi } from "../REDUX_SLICES/WarehousePeerCatalog_api/warehousePeerCatalogApi";


import { customerApi } from "../REDUX_SLICES/Customer_api/customerApi";
import customerReducer from "../REDUX_SLICES/Customer_api/customerSlice";
import { billingApi } from "../REDUX_SLICES/Billing_api/billingApi";
import billingReducer from "../REDUX_SLICES/Billing_api/billingSlice";

import { creditNoteApi } from "../REDUX_SLICES/CreditNote_api/creditNoteApi";
import creditNoteReducer from "../REDUX_SLICES/CreditNote_api/creditNoteSlice";
import { debitNoteApi } from "../REDUX_SLICES/DebitNote_api/debitNoteApi";
import { cashbankApi } from "../REDUX_SLICES/Cashbank_api/cashbankApi";
import { dashboardApi } from "../REDUX_SLICES/Dashboard_api/dashboardApi";
import { backupApi } from "../REDUX_SLICES/Backup_api/backupApi";
import offlineReducer from "../REDUX_SLICES/Offline_api/offlineSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    vendor: vendorReducer,
    [vendorApi.reducerPath]: vendorApi.reducer,
    warehouse: warehouseReducer,
    [warehouseApi.reducerPath]: warehouseApi.reducer,
    user: userReducer,
    [userApi.reducerPath]: userApi.reducer,
    inward: inwardReducer,
    [inwardApi.reducerPath]: inwardApi.reducer,
    category: categoryReducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    product: productReducer,
    [productApi.reducerPath]: productApi.reducer,
    bulkUpload: bulkUploadReducer,
    [bulkUploadApi.reducerPath]: bulkUploadApi.reducer,
    stock: stockReducer,
    [stockApi.reducerPath]: stockApi.reducer,
    purchase: purchaseReducer,
    [purchaseApi.reducerPath]: purchaseApi.reducer,
    [purchaseFinanceApi.reducerPath]: purchaseFinanceApi.reducer,
    shop: shopReducer,
    [shopApi.reducerPath]: shopApi.reducer,
    transfer: transferReducer,
    [transferApi.reducerPath]: transferApi.reducer,
    shopStock: shopStockReducer,
    [shopStockApi.reducerPath]: shopStockApi.reducer,
    transferRequest: transferRequestReducer,
    [transferRequestApi.reducerPath]: transferRequestApi.reducer,

    stockSearch: stockSearchReducer,
    [stockSearchApi.reducerPath]: stockSearchApi.reducer,
    shopLevels: shopLevelsReducer,
    [shopLevelsApi.reducerPath]: shopLevelsApi.reducer,
    bulkTransfer: bulkTransferReducer,
    [bulkTransferApi.reducerPath]: bulkTransferApi.reducer,
    [shopWarehouseCatalogApi.reducerPath]: shopWarehouseCatalogApi.reducer,
    [warehousePeerCatalogApi.reducerPath]: warehousePeerCatalogApi.reducer,

    customer: customerReducer,
    [customerApi.reducerPath]: customerApi.reducer,
    billing: billingReducer,
    [billingApi.reducerPath]: billingApi.reducer,

    creditNote: creditNoteReducer,
[creditNoteApi.reducerPath]: creditNoteApi.reducer,
    [debitNoteApi.reducerPath]: debitNoteApi.reducer,
    [cashbankApi.reducerPath]: cashbankApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [backupApi.reducerPath]: backupApi.reducer,
    offline: offlineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      vendorApi.middleware,
      warehouseApi.middleware,
      userApi.middleware,
      inwardApi.middleware,
      categoryApi.middleware,
      productApi.middleware,
      bulkUploadApi.middleware,
      stockApi.middleware,
      purchaseApi.middleware,
      purchaseFinanceApi.middleware,
      shopApi.middleware,
      shopStockApi.middleware,
      transferRequestApi.middleware,
      stockSearchApi.middleware,
      shopLevelsApi.middleware,
      bulkTransferApi.middleware,
      shopWarehouseCatalogApi.middleware,
      warehousePeerCatalogApi.middleware,
      transferApi.middleware,
      customerApi.middleware,
      billingApi.middleware,
      creditNoteApi.middleware,
      debitNoteApi.middleware,
      cashbankApi.middleware,
      dashboardApi.middleware,
      backupApi.middleware,
    ),
});
