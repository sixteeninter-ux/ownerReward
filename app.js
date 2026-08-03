"use strict";

/* =========================================================
   NC REWARD OWNER — COMPACT APP.JS

   ใช้สำหรับ:
   - Connect Wallet
   - ตรวจ Owner / Syncer
   - อ่านสถานะ Reward Core
   - Record Purchase จากข้อมูลใน BscScan

   ต้องมี:
   - ethers.js v6 UMD
   - config.js
   - abi.js
========================================================= */


/* =========================================================
   STATE
========================================================= */

let provider = null;
let signer = null;
let userAddress = null;
let rewardCore = null;

let isOwner = false;
let isSyncer = false;
let syncPaused = false;
let isBusy = false;


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

function getValue(id) {
  return el(id)?.value.trim() || "";
}

function clearValue(id) {
  const element = el(id);

  if (element) {
    element.value = "";
  }
}

function shortAddress(address) {
  if (!address) return "-";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatToken(value, decimals = 2) {
  try {
    const number = Number(
      ethers.formatUnits(value ?? 0n, 18)
    );

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  } catch {
    return "0";
  }
}

function formatPercentFromBps(value) {
  try {
    const percent = Number(value) / 100;

    return `${percent.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}%`;
  } catch {
    return "-";
  }
}


/* =========================================================
   STATUS / ERRORS
========================================================= */

function setStatus(message, type = "") {
  const status = el("appStatus");

  if (!status) {
    console.log(message);
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
    "Transaction failed";

  const lower = String(message).toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "ผู้ใช้ยกเลิกรายการ";
  }

  if (lower.includes("insufficient funds")) {
    return "BNB ไม่เพียงพอสำหรับค่า Gas";
  }

  if (
    lower.includes("not syncer") ||
    lower.includes("corev7: not syncer")
  ) {
    return "กระเป๋านี้ไม่มีสิทธิ์บันทึกรายการซื้อ";
  }

  if (
    lower.includes("purchase already recorded")
  ) {
    return "Transaction นี้ถูกบันทึกไปแล้ว";
  }

  if (lower.includes("sync paused")) {
    return "ระบบ Sync ถูก Pause อยู่";
  }

  if (
    lower.includes("ownableunauthorizedaccount") ||
    lower.includes("not owner")
  ) {
    return "กระเป๋านี้ไม่ใช่ Owner";
  }

  if (lower.includes("execution reverted")) {
    return String(message)
      .replace("execution reverted:", "")
      .trim();
  }

  return String(message);
}


/* =========================================================
   BUTTON CONTROL
========================================================= */

function updateButtons() {
  const connected = Boolean(
    userAddress && rewardCore
  );

  const canRecord =
    connected &&
    (isOwner || isSyncer) &&
    !syncPaused &&
    !isBusy;

  setDisabled(
    "connectWalletBtn",
    isBusy
  );

  setDisabled(
    "refreshBtn",
    !connected || isBusy
  );

  setDisabled(
    "recordPurchaseBtn",
    !canRecord
  );

  /*
    Owner Settings ไม่ได้ใช้ในเวอร์ชันกระชับนี้
  */

  setDisabled(
    "setRewardPercentBtn",
    true
  );

  setDisabled(
    "setMaxUplineBtn",
    true
  );

  setDisabled(
    "pauseSyncBtn",
    true
  );

  setDisabled(
    "resumeSyncBtn",
    true
  );
}

function setBusy(busy) {
  isBusy = busy;
  updateButtons();
}


/* =========================================================
   WALLET UI
========================================================= */

function updateWalletUI(connected) {
  setText(
    "walletStatus",
    connected
      ? "Connected"
      : "Not Connected"
  );

  const status = el("walletStatus");

  if (status) {
    status.classList.toggle(
      "success",
      connected
    );

    status.classList.toggle(
      "error",
      !connected
    );
  }

  setText(
    "connectWalletText",
    connected && userAddress
      ? shortAddress(userAddress)
      : "Connect Wallet"
  );

  setText(
    "walletAddress",
    connected && userAddress
      ? shortAddress(userAddress)
      : "-"
  );

  setText(
    "networkName",
    connected
      ? "BNB Smart Chain"
      : "-"
  );
}

function resetPage() {
  provider = null;
  signer = null;
  userAddress = null;
  rewardCore = null;

  isOwner = false;
  isSyncer = false;
  syncPaused = false;

  setText("contractOwner", "-");
  setText("currentRewardPercent", "-");
  setText("currentMaxUpline", "-");
  setText("currentClaimStep", "-");
  setText("currentSyncStatus", "-");
  setText("ownerStatus", "Not Checked");

  updateWalletUI(false);
  updateButtons();
}


/* =========================================================
   CONFIG
========================================================= */

function getRewardCoreAddress() {
  return (
    window.CONTRACTS?.REWARD_CORE ||
    window.CONTRACTS?.REWARD_CORE_V7 ||
    window.APP_CONFIG?.REWARD_CORE ||
    null
  );
}


/* =========================================================
   NETWORK
========================================================= */

async function ensureBSCNetwork() {
  if (!window.ethereum) {
    throw new Error(
      "กรุณาเปิดเว็บไซต์ผ่าน Wallet DApp Browser"
    );
  }

  const currentChainId =
    await window.ethereum.request({
      method: "eth_chainId"
    });

  if (
    String(currentChainId).toLowerCase() ===
    "0x38"
  ) {
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: "0x38"
        }
      ]
    });
  } catch (error) {
    if (
      error.code !== 4902 &&
      error.code !== -32603
    ) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x38",
          chainName: "BNB Smart Chain",
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18
          },
          rpcUrls: [
            "https://bsc-dataseed.binance.org/"
          ],
          blockExplorerUrls: [
            "https://bscscan.com"
          ]
        }
      ]
    });
  }
}


/* =========================================================
   CONTRACT
========================================================= */

function createContract() {
  const address =
    getRewardCoreAddress();

  if (
    !address ||
    !ethers.isAddress(address)
  ) {
    throw new Error(
      "Reward Core Address ใน config.js ไม่ถูกต้อง"
    );
  }

  if (!window.REWARD_CORE_ABI) {
    throw new Error(
      "ไม่พบ REWARD_CORE_ABI ใน abi.js"
    );
  }

  rewardCore = new ethers.Contract(
    address,
    window.REWARD_CORE_ABI,
    signer
  );
}


/* =========================================================
   CONNECT WALLET
========================================================= */

async function connectWallet() {
  try {
    setBusy(true);
    setStatus("กำลังเชื่อมกระเป๋า...");

    resetPage();

    if (!window.ethereum) {
      throw new Error(
        "กรุณาเปิดเว็บไซต์ผ่าน Wallet DApp Browser"
      );
    }

    await ensureBSCNetwork();

    const accounts =
      await window.ethereum.request({
        method: "eth_requestAccounts"
      });

    if (
      !Array.isArray(accounts) ||
      accounts.length === 0
    ) {
      throw new Error(
        "ไม่พบบัญชีกระเป๋าที่เชื่อมต่อ"
      );
    }

    const selectedAddress =
      ethers.getAddress(accounts[0]);

    provider = new ethers.BrowserProvider(
      window.ethereum,
      "any"
    );

    signer = await provider.getSigner(
      selectedAddress
    );

    userAddress = ethers.getAddress(
      await signer.getAddress()
    );

    createContract();
    updateWalletUI(true);

    await refreshAll();

    setStatus(
      `เชื่อมกระเป๋า ${shortAddress(userAddress)} สำเร็จ`,
      "success"
    );
  } catch (error) {
    resetPage();

    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    setBusy(false);
  }
}


/* =========================================================
   LOAD CORE DATA
========================================================= */

async function refreshAll() {
  if (!rewardCore || !userAddress) {
    return;
  }

  try {
    setBusy(true);
    setStatus("กำลังโหลดข้อมูล...");

    const [
      contractOwner,
      rewardBps,
      maxUpline,
      claimStep,
      paused,
      walletSyncer
    ] = await Promise.all([
      rewardCore.owner(),
      rewardCore.rewardBps(),
      rewardCore.maxUpline(),
      rewardCore.claimStep(),
      rewardCore.syncPaused(),
      rewardCore.syncers(userAddress)
    ]);

    isOwner =
      contractOwner.toLowerCase() ===
      userAddress.toLowerCase();

    isSyncer =
      Boolean(walletSyncer) || isOwner;

    syncPaused =
      Boolean(paused);

    setText(
      "contractOwner",
      shortAddress(contractOwner)
    );

    setText(
      "currentRewardPercent",
      formatPercentFromBps(rewardBps)
    );

    setText(
      "currentMaxUpline",
      maxUpline.toString()
    );

    setText(
      "currentClaimStep",
      `${formatToken(claimStep)} NC`
    );

    setText(
      "currentSyncStatus",
      syncPaused
        ? "PAUSED"
        : "ACTIVE"
    );

    const syncStatus =
      el("currentSyncStatus");

    if (syncStatus) {
      syncStatus.classList.toggle(
        "error",
        syncPaused
      );

      syncStatus.classList.toggle(
        "success",
        !syncPaused
      );
    }

    let accessText = "No Access";
    let accessClass = "error";

    if (isOwner) {
      accessText = "Owner";
      accessClass = "success";
    } else if (isSyncer) {
      accessText = "Syncer";
      accessClass = "warning";
    }

    setText(
      "ownerStatus",
      accessText
    );

    const accessElement =
      el("ownerStatus");

    if (accessElement) {
      accessElement.className =
        accessClass;
    }

    setStatus(
      "โหลดข้อมูลเรียบร้อย",
      "success"
    );
  } catch (error) {
    setStatus(
      `โหลดข้อมูลไม่สำเร็จ: ${getErrorMessage(error)}`,
      "error"
    );
  } finally {
    setBusy(false);
  }
}


/* =========================================================
   TRANSACTION HASH
========================================================= */

function normalizeTransactionHash(value) {
  const txHash =
    String(value)
      .trim()
      .toLowerCase();

  if (
    !ethers.isHexString(txHash, 32)
  ) {
    throw new Error(
      "Transaction Hash ไม่ถูกต้อง ต้องขึ้นต้นด้วย 0x และมีครบ 66 ตัวอักษร"
    );
  }

  /*
    Transaction Hash มีขนาด bytes32 อยู่แล้ว
    จึงใช้เป็น Purchase ID ได้โดยตรง
  */

  return txHash;
}


/* =========================================================
   RECORD PURCHASE
========================================================= */

async function recordPurchase() {
  if (!rewardCore || !userAddress) {
    await connectWallet();
    return;
  }

  try {
    if (!isOwner && !isSyncer) {
      throw new Error(
        "กระเป๋านี้ไม่มีสิทธิ์ Record Purchase"
      );
    }

    if (syncPaused) {
      throw new Error(
        "ระบบ Sync ถูก Pause อยู่"
      );
    }

    const buyerInput =
      getValue("buyerAddressInput");

    const amountInput =
      getValue("purchaseAmountInput");

    const txHashInput =
      getValue("purchaseReferenceInput");

    if (!ethers.isAddress(buyerInput)) {
      throw new Error(
        "Buyer Wallet ไม่ถูกต้อง"
      );
    }

    const buyer =
      ethers.getAddress(buyerInput);

    if (!amountInput) {
      throw new Error(
        "กรุณากรอก Purchase Amount"
      );
    }

    const amountNumber =
      Number(amountInput);

    if (
      !Number.isFinite(amountNumber) ||
      amountNumber <= 0
    ) {
      throw new Error(
        "Purchase Amount ไม่ถูกต้อง"
      );
    }

    /*
      CoreV7 ใช้ 18 decimals

      100 USDT  = 100e18
      500 USDT  = 500e18
      1000 USDT = 1000e18
    */

    const purchaseAmount =
      ethers.parseUnits(
        amountInput,
        18
      );

    const purchaseId =
      normalizeTransactionHash(
        txHashInput
      );

    const alreadyProcessed =
      await rewardCore.processedPurchases(
        purchaseId
      );

    if (alreadyProcessed) {
      throw new Error(
        "Transaction นี้ถูกบันทึกไปแล้ว"
      );
    }

    const confirmed =
      window.confirm(
        [
          "ยืนยัน Record Purchase?",
          "",
          `Buyer: ${buyer}`,
          `Amount: ${amountInput} USDT`,
          `Transaction Hash: ${txHashInput}`,
          "",
          "ข้อมูลที่บันทึกแล้วไม่สามารถแก้ไขย้อนหลังได้"
        ].join("\n")
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    setStatus(
      "กำลังส่งรายการ Record Purchase..."
    );

    const transaction =
      await rewardCore.recordPurchase(
        purchaseId,
        buyer,
        purchaseAmount
      );

    setStatus(
      "ส่งรายการแล้ว กำลังรอยืนยันบน Blockchain..."
    );

    await transaction.wait();

    clearValue("buyerAddressInput");
    clearValue("purchaseAmountInput");
    clearValue("purchaseReferenceInput");

    setStatus(
      `บันทึกยอดซื้อ ${amountInput} USDT สำเร็จ`,
      "success"
    );

    await refreshAll();
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    setBusy(false);
  }
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
  el("connectWalletBtn")
    ?.addEventListener(
      "click",
      connectWallet
    );

  el("refreshBtn")
    ?.addEventListener(
      "click",
      async () => {
        if (!userAddress) {
          await connectWallet();
          return;
        }

        await refreshAll();
      }
    );

  el("recordPurchaseBtn")
    ?.addEventListener(
      "click",
      recordPurchase
    );
}


/* =========================================================
   WALLET EVENTS
========================================================= */

function bindWalletEvents() {
  if (!window.ethereum) {
    return;
  }

  window.ethereum.on?.(
    "accountsChanged",
    async (accounts) => {
      resetPage();

      if (
        !Array.isArray(accounts) ||
        accounts.length === 0
      ) {
        setStatus(
          "กระเป๋าถูกตัดการเชื่อมต่อ"
        );

        return;
      }

      await connectWallet();
    }
  );

  window.ethereum.on?.(
    "chainChanged",
    () => {
      resetPage();

      setStatus(
        "เครือข่ายถูกเปลี่ยน กรุณากด Connect Wallet"
      );
    }
  );
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    resetPage();
    bindEvents();
    bindWalletEvents();

    if (!window.ethereum) {
      setStatus(
        "กรุณาเปิดผ่าน Wallet DApp Browser",
        "error"
      );

      return;
    }

    setStatus(
      "กรุณากด Connect Wallet"
    );
  }
);
