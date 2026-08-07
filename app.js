"use strict";

/* =========================================================
   NC REWARD OWNER — APP.JS
   ES Module Entry Point
========================================================= */

import {
  initWallet
} from "./wallet.js";

import {
  initOwner
} from "./owner.js";


/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    try {

      /* -------------------------
         INIT WALLET
      ------------------------- */

      const walletReady =
        initWallet();


      /* -------------------------
         INIT OWNER
      ------------------------- */

      const ownerReady =
        initOwner();


      /* -------------------------
         STATUS
      ------------------------- */

      if (
        walletReady &&
        ownerReady
      ) {

        const status =
          document.getElementById(
            "appStatus"
          );

        if (status) {
          status.textContent =
            "กรุณาเชื่อมกระเป๋า";

          status.className =
            "status";
        }

      }

    } catch (error) {

      console.error(
        "App init error:",
        error
      );

      const status =
        document.getElementById(
          "appStatus"
        );

      if (status) {

        status.textContent =
          error?.message ||
          "เปิดแอปไม่สำเร็จ";

        status.className =
          "status error";
      }
    }
  }
);
