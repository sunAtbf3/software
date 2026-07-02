import React from "react";
import { toast as notify, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** Single source for all toast timing, theme, and styling. */
export const APP_TOAST_SETTINGS = {
  position: "top-right",
  autoClose: 100,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

const withDefaults = (options = {}) => ({
  ...APP_TOAST_SETTINGS,
  ...options,
});

/** Use this everywhere instead of importing react-toastify directly. */
export const toast = {
  success: (message, options) => notify.success(message, withDefaults(options)),
  error: (message, options) => notify.error(message, withDefaults(options)),
  info: (message, options) => notify.info(message, withDefaults(options)),
  warning: (message, options) => notify.warning(message, withDefaults(options)),
  warn: (message, options) => notify.warn(message, withDefaults(options)),
};

const ToastConfig = () => {
  return (
    <ToastContainer
      position={APP_TOAST_SETTINGS.position}
      autoClose={APP_TOAST_SETTINGS.autoClose}
      hideProgressBar={APP_TOAST_SETTINGS.hideProgressBar}
      newestOnTop={APP_TOAST_SETTINGS.newestOnTop}
      closeOnClick={APP_TOAST_SETTINGS.closeOnClick}
      pauseOnHover={APP_TOAST_SETTINGS.pauseOnHover}
      draggable={APP_TOAST_SETTINGS.draggable}
      theme={APP_TOAST_SETTINGS.theme}
      toastClassName="!bg-white !border !border-gray-300 !rounded !shadow-md !text-sm !text-gray-800"
      bodyClassName="!text-sm !font-normal !text-gray-800"
      progressClassName="!bg-blue-700"
    />
  );
};

export default ToastConfig;
