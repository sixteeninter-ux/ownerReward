"use strict";

/* =========================================================
   NC REWARD DAPP — WALLET.JS
   ethers.js v6 / ES Module
========================================================= */


/* =========================================================
   SHARED WALLET STATE
========================================================= */

export const walletState = {
  provider: null,
  signer: null,
  userAddress: null,

  ncToken: null,
  rewardCore: null,
  rewardVault: null,
  rewardStaking: null,

  connected: false
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value;
  }
}

function shortAddress(address) {
  if (!address) {
    return "-";
  }

  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );
}

function getErrorMessage(error) {
  console.error(error);

  const message =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.error?.message ||
    error?.message ||
    "เกิดข้อผิดพลาด";

  const lowerMessage =
    String(message).toLowerCase();

  if (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("rejected the request")
  ) {
    return "ผู้ใช้ยกเลิกรายการ";
  }

  if (
    lowerMessage.includes("insufficient funds")
  ) {
    return "BNB ไม่เพียงพอสำหรับค่า Gas";
  }

  return String(message);
}


/* =========================================================
   NOTIFICATION
========================================================= */

function showNotification(
  title,
  message,
  type = ""
) {
  const notification =
    getElement("notification");

  setText(
    "notificationTitle",
    title
  );

  setText(
    "notificationMessage",
    message
  );

  if (!notification) {
    console.log(title, message);
    return;
  }

  notification.className =
    `notification ${type}`.trim();

  notification.classList.remove(
    "hidden"
  );

  window.clearTimeout(
    showNotification.timer
  );

  showNotification.timer =
    window.setTimeout(
      () => {
        notification.classList.add(
          "hidden"
        );
      },
      5000
    );
}


/* =========================================================
   CONFIG VALIDATION
========================================================= */

function validateWalletConfig() {
  if (!window.ethers) {
    throw new Error(
      "ไม่พบ ethers.js"
    );
  }

  if (!window.ethereum) {
    throw new Error(
      "กรุณาเปิดเว็บไซต์ผ่าน Wallet DApp Browser"
    );
  }

  if (!window.CONTRACTS) {
    throw new Error(
      "ไม่พบ CONTRACTS ใน config.js"
    );
  }

  if (!window.NC_TOKEN_ABI) {
    throw new Error(
      "ไม่พบ NC_TOKEN_ABI"
    );
  }

  if (!window.REWARD_CORE_ABI) {
    throw new Error(
      "ไม่พบ REWARD_CORE_ABI"
    );
  }

  if (!window.REWARD_VAULT_ABI) {
    throw new Error(
      "ไม่พบ REWARD_VAULT_ABI"
    );
  }

  if (!window.REWARD_STAKING_ABI) {
    throw new Error(
      "ไม่พบ REWARD_STAKING_ABI"
    );
  }

  const requiredAddresses = [
    "NC_TOKEN",
    "REWARD_CORE",
    "REWARD_VAULT",
    "REWARD_STAKING"
  ];

  for (
    const key of requiredAddresses
  ) {
    if (!window.CONTRACTS[key]) {
      throw new Error(
        `ไม่พบ ${key} ใน config.js`
      );
    }
  }
}


/* =========================================================
   BSC NETWORK
========================================================= */

export async function ensureBSCNetwork() {
  validateWalletConfig();

  const targetChainId =
    window.APP_CONFIG
      ?.CHAIN_ID_HEX ||
    "0x38";

  const currentChainId =
    await window.ethereum.request({
      method: "eth_chainId"
    });

  if (
    String(currentChainId)
      .toLowerCase() ===
    targetChainId.toLowerCase()
  ) {
    return true;
  }

  try {
    await window.ethereum.request({
      method:
        "wallet_switchEthereumChain",

      params: [
        {
          chainId:
            targetChainId
        }
      ]
    });

    return true;
  } catch (switchError) {
    if (
      switchError?.code !== 4902 &&
      switchError?.code !== -32603
    ) {
      throw switchError;
    }

    await window.ethereum.request({
      method:
        "wallet_addEthereumChain",

      params: [
        {
          chainId:
            targetChainId,

          chainName:
            window.APP_CONFIG
              ?.CHAIN_NAME ||
            "BNB Smart Chain",

          nativeCurrency:
            window.APP_CONFIG
              ?.NATIVE_CURRENCY ||
            {
              name: "BNB",
              symbol: "BNB",
              decimals: 18
            },

          rpcUrls:
            window.APP_CONFIG
              ?.RPC_URLS ||
            [
              "https://bsc-dataseed.binance.org/"
            ],

          blockExplorerUrls: [
            window.APP_CONFIG
              ?.BLOCK_EXPLORER ||
            "https://bscscan.com"
          ]
        }
      ]
    });

    return true;
  }
}


/* =========================================================
   CREATE CONTRACT INSTANCES
========================================================= */

function createContracts() {
  const contracts =
    window.CONTRACTS;

  walletState.ncToken =
    new ethers.Contract(
      contracts.NC_TOKEN,
      window.NC_TOKEN_ABI,
      walletState.signer
    );

  walletState.rewardCore =
    new ethers.Contract(
      contracts.REWARD_CORE,
      window.REWARD_CORE_ABI,
      walletState.signer
    );

  walletState.rewardVault =
    new ethers.Contract(
      contracts.REWARD_VAULT,
      window.REWARD_VAULT_ABI,
      walletState.signer
    );

  walletState.rewardStaking =
    new ethers.Contract(
      contracts.REWARD_STAKING,
      window.REWARD_STAKING_ABI,
      walletState.signer
    );
}


/* =========================================================
   WALLET UI
========================================================= */

function updateConnectedUI() {
  setText(
    "walletAddress",
    shortAddress(
      walletState.userAddress
    )
  );

  setText(
    "walletStatus",
    "Connected"
  );

  setText(
    "networkName",
    "BNB Smart Chain"
  );

  setText(
    "connectWalletText",
    shortAddress(
      walletState.userAddress
    )
  );

  const walletStatus =
    getElement("walletStatus");

  if (walletStatus) {
    walletStatus.classList.remove(
      "status-offline"
    );

    walletStatus.classList.add(
      "status-online"
    );
  }
}

function updateDisconnectedUI() {
  setText(
    "walletAddress",
    "-"
  );

  setText(
    "walletStatus",
    "Not Connected"
  );

  setText(
    "connectWalletText",
    "Connect Wallet"
  );

  setText(
    "ncBalance",
    "0 NC"
  );

  const walletStatus =
    getElement("walletStatus");

  if (walletStatus) {
    walletStatus.classList.remove(
      "status-online"
    );

    walletStatus.classList.add(
      "status-offline"
    );
  }
}


/* =========================================================
   SET ACTIVE ACCOUNT
========================================================= */

async function setActiveAccount(
  address
) {
  walletState.provider =
    new ethers.BrowserProvider(
      window.ethereum,
      "any"
    );

  walletState.signer =
    await walletState.provider
      .getSigner(address);

  walletState.userAddress =
    ethers.getAddress(
      await walletState.signer
        .getAddress()
    );

  createContracts();

  walletState.connected =
    true;

  updateConnectedUI();

  document.dispatchEvent(
    new CustomEvent(
      "walletConnected",
      {
        detail: {
          address:
            walletState.userAddress
        }
      }
    )
  );

  return walletState.userAddress;
}


/* =========================================================
   CONNECT WALLET
========================================================= */

export async function connectWallet() {
  const button =
    getElement("connectWalletBtn");

  try {
    validateWalletConfig();

    if (button) {
      button.disabled = true;
    }

    setText(
      "connectWalletText",
      "Connecting..."
    );

    await ensureBSCNetwork();

    const accounts =
      await window.ethereum.request({
        method:
          "eth_requestAccounts"
      });

    if (
      !Array.isArray(accounts) ||
      accounts.length === 0
    ) {
      throw new Error(
        "ไม่พบบัญชีกระเป๋า"
      );
    }

    await setActiveAccount(
      accounts[0]
    );

    showNotification(
      "เชื่อมต่อสำเร็จ",
      `Wallet ${shortAddress(
        walletState.userAddress
      )}`,
      "success"
    );

    return walletState.userAddress;
  } catch (error) {
    disconnectWallet();

    showNotification(
      "เชื่อมต่อไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );

    throw error;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================================================
   DISCONNECT WALLET
========================================================= */

export function disconnectWallet() {
  walletState.provider = null;
  walletState.signer = null;
  walletState.userAddress = null;

  walletState.ncToken = null;
  walletState.rewardCore = null;
  walletState.rewardVault = null;
  walletState.rewardStaking = null;

  walletState.connected = false;

  updateDisconnectedUI();

  document.dispatchEvent(
    new CustomEvent(
      "walletDisconnected"
    )
  );
}


/* =========================================================
   WALLET EVENTS
========================================================= */

function bindWalletProviderEvents() {
  if (!window.ethereum?.on) {
    return;
  }

  window.ethereum.on(
    "accountsChanged",
    async (accounts) => {
      if (
        !Array.isArray(accounts) ||
        accounts.length === 0
      ) {
        disconnectWallet();

        showNotification(
          "Wallet Disconnected",
          "กระเป๋าถูกตัดการเชื่อมต่อ"
        );

        return;
      }

      try {
        await ensureBSCNetwork();

        await setActiveAccount(
          accounts[0]
        );

        showNotification(
          "เปลี่ยนกระเป๋าแล้ว",
          shortAddress(
            walletState.userAddress
          ),
          "success"
        );
      } catch (error) {
        disconnectWallet();

        showNotification(
          "เปลี่ยนกระเป๋าไม่สำเร็จ",
          getErrorMessage(error),
          "error"
        );
      }
    }
  );

  window.ethereum.on(
    "chainChanged",
    async (chainId) => {
      const targetChainId =
        window.APP_CONFIG
          ?.CHAIN_ID_HEX ||
        "0x38";

      if (
        String(chainId)
          .toLowerCase() !==
        targetChainId.toLowerCase()
      ) {
        disconnectWallet();

        showNotification(
          "เครือข่ายไม่ถูกต้อง",
          "กรุณาเปลี่ยนเป็น BNB Smart Chain",
          "error"
        );

        return;
      }

      window.location.reload();
    }
  );
}


/* =========================================================
   GETTERS FOR OTHER MODULES
========================================================= */

export function getProvider() {
  return walletState.provider;
}

export function getSigner() {
  return walletState.signer;
}

export function getUserAddress() {
  return walletState.userAddress;
}

export function getContracts() {
  return {
    ncToken:
      walletState.ncToken,

    rewardCore:
      walletState.rewardCore,

    rewardVault:
      walletState.rewardVault,

    rewardStaking:
      walletState.rewardStaking
  };
}

export function isWalletConnected() {
  return (
    walletState.connected &&
    Boolean(
      walletState.userAddress
    )
  );
}


/* =========================================================
   INITIALIZE WALLET MODULE
========================================================= */

export function initWallet() {
  try {
    validateWalletConfig();

    updateDisconnectedUI();

    bindWalletProviderEvents();

    const connectButton =
      getElement(
        "connectWalletBtn"
      );

    connectButton
      ?.addEventListener(
        "click",
        connectWallet
      );

    const closeButton =
      getElement(
        "closeNotificationBtn"
      );

    closeButton
      ?.addEventListener(
        "click",
        () => {
          getElement(
            "notification"
          )?.classList.add(
            "hidden"
          );
        }
      );

    return true;
  } catch (error) {
    showNotification(
      "Wallet Error",
      getErrorMessage(error),
      "error"
    );

    return false;
  }
}
