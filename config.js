"use strict";

/* =========================================================
   NC REWARD OWNER — CONFIG.JS
   BNB Smart Chain Mainnet
========================================================= */

const APP_CONFIG = {
  APP_NAME: "NC Reward Owner",

  CHAIN_ID: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BNB Smart Chain",

  RPC_URLS: [
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/"
  ],

  BLOCK_EXPLORER_URL: "https://bscscan.com",

  NATIVE_CURRENCY: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  },

  TOKEN_DECIMALS: 18
};


/* =========================================================
   CONTRACT ADDRESSES
========================================================= */

const CONTRACTS = {
  NC_TOKEN:
    "0xA0db9B043EA0387BA0f7480189F0392EdAA72108",

  LEGACY_CORE:
    "0xAE2523dE8eD5EcE8e160EDEB157CAc108F9E163e",

  REWARD_CORE:
    "0x1e60dE14dD2FE30082124bCf44637c1C91ea548F",

  REWARD_VAULT:
    "0x56572E98F8992634bA20680222E9788Df7B55A61",

  REWARD_STAKING:
    "0x9c441A269526B57A9a2C98e31f64CEB485b8886b"
};


/* =========================================================
   DISPLAY DEFAULTS
========================================================= */

const DEFAULTS = {
  REWARD_PERCENT: 100,
  MAX_UPLINE: 10,
  CLAIM_STEP_NC: 20000
};


/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.APP_CONFIG = APP_CONFIG;
window.CONTRACTS = CONTRACTS;
window.DEFAULTS = DEFAULTS;
