"use strict";

/* =========================================================
   NC REWARD OWNER — WALLET.JS
   ES Module / ethers.js v6
========================================================= */

export const walletState = {
  provider: null,
  signer: null,
  address: null,
  rewardCore: null,
  connected: false,
  isOwner: false
};


/* =========================================================
   HELPERS
========================================================= */

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = el(id);

  if (element) {
    element.textContent = value;
  }
}

function setDisabled(id, disabled) {
  const element = el(id);

  if (element) {
    element.disabled = disabled;
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

function setStatus(message, type = "") {
  const status = el("appStatus");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `status ${type}`.trim();
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

  const lower =
    String(message).toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "ผู้ใช้ยกเลิกรายการ";
  }

  if (
    lower.includes("insufficient funds")
  ) {
    return "BNB ไม่เพียงพอสำหรับค่า Gas";
  }

  return String(message);
}


/* =========================================================
   CONFIG CHECK
========================================================= */

function validateConfig() {
  if (!window.ethers) {
    throw new Error(
      "ไม่พบ ethers.js"
    );
  }

  if (!window.ethereum) {
    throw new Error(
      "กรุณาเปิดผ่าน MetaMask หรือ Wallet DApp Browser"
    );
  }

  if (!window.APP_CONFIG) {
    throw new Error(
      "ไม่พบ APP_CONFIG ใน config.js"
    );
  }

  if (!window.CONTRACTS?.REWARD_CORE) {
    throw new Error(
      "ไม่พบ REWARD_CORE Address"
    );
  }

  if (!window.REWARD_CORE_ABI) {
    throw new Error(
      "ไม่พบ REWARD_CORE_ABI"
    );
  }
}


/* =========================================================
   NETWORK
========================================================= */

export async function ensureBSCNetwork() {
  validateConfig();

  const targetChainId =
    window.APP_CONFIG.CHAIN_ID_HEX ||
    "0x38";

  const currentChainId =
    await window.ethereum.request({
      method: "eth_chainId"
    });

  if (
    String(currentChainId).toLowerCase() ===
    String(targetChainId).toLowerCase()
  ) {
    return true;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: targetChainId
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
      method: "wallet_addEthereumChain",

      params: [
        {
          chainId: targetChainId,

          chainName:
            window.APP_CONFIG.CHAIN_NAME ||
            "BNB Smart Chain",

          nativeCurrency:
            window.APP_CONFIG.NATIVE_CURRENCY ||
            {
              name: "BNB",
              symbol: "BNB",
              decimals: 18
            },

          rpcUrls:
            window.APP_CONFIG.RPC_URLS,

          blockExplorerUrls: [
            window.APP_CONFIG.BLOCK_EXPLORER_URL ||
            "https://bscscan.com"
          ]
        }
      ]
    });

    return true;
  }
}


/* =========================================================
   CREATE CONTRACT
========================================================= */

function createRewardCoreContract() {
  walletState.rewardCore =
    new ethers.Contract(
      window.CONTRACTS.REWARD_CORE,
      window.REWARD_CORE_ABI,
      walletState.signer
    );
}


/* =========================================================
   OWNER CHECK
========================================================= */

export async function checkOwnerAccess() {
  if (
    !walletState.rewardCore ||
    !walletState.address
  ) {
    walletState.isOwner = false;

    setText(
      "ownerStatus",
      "-"
    );

    return false;
  }

  const contractOwner =
    ethers.getAddress(
      await walletState.rewardCore.owner()
    );

  const currentWallet =
    ethers.getAddress(
      walletState.address
    );

  const isOwner =
    contractOwner.toLowerCase() ===
    currentWallet.toLowerCase();

  walletState.isOwner =
    isOwner;

  setText(
    "contractOwner",
    shortAddress(contractOwner)
  );

  setText(
    "ownerStatus",
    isOwner
      ? "Owner"
      : "No Access"
  );

  setDisabled(
    "refreshBtn",
    !isOwner
  );

  setDisabled(
    "recordPurchaseBtn",
    !isOwner
  );

  if (isOwner) {
    setStatus(
      "Owner Wallet Connected",
      "success"
    );
  } else {
    setStatus(
      "Wallet นี้ไม่ใช่ Owner",
      "error"
    );
  }

  return isOwner;
}


/* =========================================================
   SET ACTIVE ACCOUNT
========================================================= */

async function setActiveAccount(address) {
  walletState.provider =
    new ethers.BrowserProvider(
      window.ethereum,
      "any"
    );

  walletState.signer =
    await walletState.provider.getSigner(
      address
    );

  walletState.address =
    ethers.getAddress(
      await walletState.signer.getAddress()
    );

  createRewardCoreContract();

  walletState.connected = true;

  setText(
    "walletStatus",
    "Connected"
  );

  setText(
    "walletAddress",
    shortAddress(
      walletState.address
    )
  );

  setText(
    "networkName",
    "BNB Smart Chain"
  );

  setText(
    "connectWalletText",
    shortAddress(
      walletState.address
    )
  );

  await checkOwnerAccess();

  document.dispatchEvent(
    new CustomEvent(
      "walletConnected",
      {
        detail: {
          address:
            walletState.address,

          isOwner:
            walletState.isOwner
        }
      }
    )
  );

  return walletState.address;
}


/* =========================================================
   CONNECT WALLET
========================================================= */

export async function connectWallet() {
  const button =
    el("connectWalletBtn");

  try {
    validateConfig();

    if (button) {
      button.disabled = true;
    }

    setStatus(
      "กำลังเชื่อม Wallet..."
    );

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
        "ไม่พบบัญชี Wallet"
      );
    }

    await setActiveAccount(
      accounts[0]
    );

    return walletState.address;

  } catch (error) {

    resetWallet();

    setStatus(
      getErrorMessage(error),
      "error"
    );

    throw error;

  } finally {

    if (button) {
      button.disabled = false;
    }

    if (!walletState.connected) {
      setText(
        "connectWalletText",
        "Connect Wallet"
      );
    }
  }
}


/* =========================================================
   REFRESH WALLET
========================================================= */

export async function refreshWallet() {
  if (!walletState.address) {
    return false;
  }

  await ensureBSCNetwork();

  await checkOwnerAccess();

  return true;
}


/* =========================================================
   RESET
========================================================= */

export function resetWallet() {
  walletState.provider = null;
  walletState.signer = null;
  walletState.address = null;
  walletState.rewardCore = null;

  walletState.connected = false;
  walletState.isOwner = false;

  setText(
    "walletStatus",
    "Not Connected"
  );

  setText(
    "walletAddress",
    "-"
  );

  setText(
    "networkName",
    "-"
  );

  setText(
    "ownerStatus",
    "-"
  );

  setText(
    "contractOwner",
    "-"
  );

  setText(
    "connectWalletText",
    "Connect Wallet"
  );

  setDisabled(
    "refreshBtn",
    true
  );

  setDisabled(
    "recordPurchaseBtn",
    true
  );
}


/* =========================================================
   GETTERS
========================================================= */

export function getRewardCore() {
  return walletState.rewardCore;
}

export function getSigner() {
  return walletState.signer;
}

export function getProvider() {
  return walletState.provider;
}

export function getUserAddress() {
  return walletState.address;
}

export function isWalletConnected() {
  return (
    walletState.connected &&
    Boolean(walletState.address)
  );
}

export function isOwnerWallet() {
  return walletState.isOwner;
}


/* =========================================================
   WALLET EVENTS
========================================================= */

function bindWalletEvents() {
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
        resetWallet();

        setStatus(
          "Wallet Disconnected"
        );

        document.dispatchEvent(
          new CustomEvent(
            "walletDisconnected"
          )
        );

        return;
      }

      try {

        await ensureBSCNetwork();

        await setActiveAccount(
          accounts[0]
        );

      } catch (error) {

        resetWallet();

        setStatus(
          getErrorMessage(error),
          "error"
        );
      }
    }
  );


  window.ethereum.on(
    "chainChanged",
    async (chainId) => {

      const target =
        window.APP_CONFIG
          ?.CHAIN_ID_HEX ||
        "0x38";

      if (
        String(chainId).toLowerCase() !==
        String(target).toLowerCase()
      ) {

        resetWallet();

        setStatus(
          "กรุณาเปลี่ยนเป็น BNB Smart Chain",
          "error"
        );

        return;
      }

      if (
        walletState.address
      ) {
        try {

          await setActiveAccount(
            walletState.address
          );

        } catch (error) {

          setStatus(
            getErrorMessage(error),
            "error"
          );
        }
      }
    }
  );
}


/* =========================================================
   INIT
========================================================= */

export function initWallet() {
  resetWallet();

  try {

    validateConfig();

    bindWalletEvents();

    const connectButton =
      el("connectWalletBtn");

    connectButton?.addEventListener(
      "click",
      connectWallet
    );

    setStatus(
      "กรุณาเชื่อมกระเป๋า"
    );

    return true;

  } catch (error) {

    setStatus(
      getErrorMessage(error),
      "error"
    );

    return false;
  }
}
