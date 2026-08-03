"use strict";

/* =========================================================
   NC REWARD OWNER — APP.JS

   ความสามารถ:
   - Connect Wallet
   - ตรวจ Owner / Syncer
   - Record Purchase
   - เปลี่ยน Reward %
   - เปลี่ยน Max Upline
   - Pause / Resume Sync
   - แสดงค่าปัจจุบัน

   ใช้ร่วมกับ:
   - ethers.js v6
   - config.js
   - abi.js
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let provider = null;
let signer = null;
let userAddress = null;
let rewardCore = null;

let isOwner = false;
let isSyncer = false;
let isLoading = false;


/* =========================================================
   ELEMENT HELPERS
========================================================= */

function findElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);

    if (element) {
      return element;
    }
  }

  return null;
}

function setText(ids, value) {
  const element = findElement(...ids);

  if (element) {
    element.textContent = value;
  }
}

function setDisabled(ids, disabled) {
  const element = findElement(...ids);

  if (element) {
    element.disabled = disabled;
  }
}

function getInputValue(id) {
  const input = document.getElementById(id);

  return input
    ? input.value.trim()
    : "";
}

function clearInput(id) {
  const input = document.getElementById(id);

  if (input) {
    input.value = "";
  }
}


/* =========================================================
   FORMATTERS
========================================================= */

function shortAddress(address) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatToken(value, decimals = 2) {
  try {
    const formatted = ethers.formatUnits(
      value ?? 0n,
      18
    );

    const number = Number(formatted);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.warn("formatToken error:", error);
    return "0";
  }
}

function formatPercentFromBps(bps) {
  try {
    const value = Number(bps) / 100;

    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}%`;
  } catch {
    return "-";
  }
}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getErrorMessage(error) {
  console.error(error);

  const message =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.error?.message ||
    error?.message ||
    "Transaction failed";

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

  if (
    lowerMessage.includes("not owner") ||
    lowerMessage.includes("ownableunauthorizedaccount")
  ) {
    return "กระเป๋านี้ไม่ใช่ Owner";
  }

  if (
    lowerMessage.includes("not syncer")
  ) {
    return "กระเป๋านี้ไม่มีสิทธิ์ Sync";
  }

  if (
    lowerMessage.includes("purchase already recorded")
  ) {
    return "Reference นี้ถูกบันทึกไปแล้ว";
  }

  if (
    lowerMessage.includes("sync paused")
  ) {
    return "ระบบ Sync ถูก Pause อยู่";
  }

  if (
    lowerMessage.includes("execution reverted")
  ) {
    return String(message)
      .replace("execution reverted:", "")
      .trim();
  }

  return String(message);
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(message, type = "") {
  const status = findElement(
    "appStatus",
    "status",
    "transactionStatus"
  );

  if (!status) {
    console.log(`[${type || "status"}] ${message}`);
    return;
  }

  status.textContent = message;
  status.className = `status ${type}`.trim();
}


/* =========================================================
   BUTTON CONTROL
========================================================= */

function updateActionButtons(syncPaused = false) {
  const canRecord =
    Boolean(userAddress) &&
    (isOwner || isSyncer) &&
    !syncPaused &&
    !isLoading;

  const canOwnerWrite =
    Boolean(userAddress) &&
    isOwner &&
    !isLoading;

  setDisabled(
    ["recordPurchaseBtn"],
    !canRecord
  );

  setDisabled(
    ["setRewardPercentBtn"],
    !canOwnerWrite
  );

  setDisabled(
    ["setMaxUplineBtn"],
    !canOwnerWrite
  );

  setDisabled(
    ["pauseSyncBtn"],
    !canOwnerWrite || syncPaused
  );

  setDisabled(
    ["resumeSyncBtn"],
    !canOwnerWrite || !syncPaused
  );

  setDisabled(
    ["refreshBtn"],
    !userAddress || isLoading
  );
}

function setLoading(loading) {
  isLoading = loading;

  setDisabled(
    ["connectWalletBtn"],
    loading
  );

  if (loading) {
    setDisabled(
      [
        "refreshBtn",
        "recordPurchaseBtn",
        "setRewardPercentBtn",
        "setMaxUplineBtn",
        "pauseSyncBtn",
        "resumeSyncBtn"
      ],
      true
    );
  }
}


/* =========================================================
   WALLET UI
========================================================= */

function updateWalletUI(connected) {
  setText(
    ["walletStatus"],
    connected
      ? "Connected"
      : "Not Connected"
  );

  const walletStatus =
    document.getElementById("walletStatus");

  if (walletStatus) {
    walletStatus.classList.toggle(
      "success",
      connected
    );

    walletStatus.classList.toggle(
      "error",
      !connected
    );
  }

  setText(
    ["connectWalletText"],
    connected && userAddress
      ? shortAddress(userAddress)
      : "Connect Wallet"
  );

  setText(
    ["walletAddress"],
    connected && userAddress
      ? shortAddress(userAddress)
      : "-"
  );

  setText(
    ["networkName"],
    connected
      ? "BNB Smart Chain"
      : "-"
  );
}

function resetPageData() {
  isOwner = false;
  isSyncer = false;

  setText(["contractOwner"], "-");
  setText(["currentRewardPercent"], "-");
  setText(["currentMaxUpline"], "-");
  setText(["currentClaimStep"], "-");
  setText(["currentSyncStatus"], "-");
  setText(["ownerStatus"], "Not Checked");

  updateActionButtons(false);
}

function resetWalletConnection() {
  provider = null;
  signer = null;
  userAddress = null;
  rewardCore = null;

  resetPageData();
  updateWalletUI(false);
}


/* =========================================================
   CONTRACT ADDRESS
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
   BSC NETWORK
========================================================= */

async function ensureBSCNetwork() {
  if (!window.ethereum) {
    throw new Error(
      "กรุณาเปิดเว็บไซต์ผ่าน Wallet DApp Browser"
    );
  }

  const chainId =
    await window.ethereum.request({
      method: "eth_chainId"
    });

  if (
    String(chainId).toLowerCase() === "0x38"
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
  } catch (switchError) {
    if (
      switchError.code !== 4902 &&
      switchError.code !== -32603
    ) {
      throw switchError;
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
   CREATE CONTRACT
========================================================= */

function createContract() {
  const coreAddress =
    getRewardCoreAddress();

  if (!coreAddress) {
    throw new Error(
      "ไม่พบ REWARD_CORE ใน config.js"
    );
  }

  if (!ethers.isAddress(coreAddress)) {
    throw new Error(
      "Reward Core Address ไม่ถูกต้อง"
    );
  }

  if (!window.REWARD_CORE_ABI) {
    throw new Error(
      "ไม่พบ REWARD_CORE_ABI ใน abi.js"
    );
  }

  rewardCore = new ethers.Contract(
    coreAddress,
    window.REWARD_CORE_ABI,
    signer
  );
}


/* =========================================================
   SET ACTIVE ACCOUNT
========================================================= */

async function setActiveAccount(address) {
  if (!window.ethereum) {
    throw new Error(
      "ไม่พบ Wallet Provider"
    );
  }

  if (!ethers.isAddress(address)) {
    throw new Error(
      "Wallet Address ไม่ถูกต้อง"
    );
  }

  const selectedAddress =
    ethers.getAddress(address);

  provider = new ethers.BrowserProvider(
    window.ethereum,
    "any"
  );

  signer = await provider.getSigner(
    selectedAddress
  );

  const signerAddress =
    ethers.getAddress(
      await signer.getAddress()
    );

  if (
    signerAddress.toLowerCase() !==
    selectedAddress.toLowerCase()
  ) {
    throw new Error(
      "บัญชี Wallet ไม่ตรงกับบัญชีที่เลือก"
    );
  }

  userAddress = signerAddress;

  createContract();
  updateWalletUI(true);
}


/* =========================================================
   CONNECT WALLET
========================================================= */

async function connectWallet() {
  try {
    setLoading(true);
    setStatus("กำลังเชื่อมกระเป๋า...");

    resetWalletConnection();

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

    await setActiveAccount(accounts[0]);
    await refreshAll();

    setStatus(
      `เชื่อมกระเป๋า ${shortAddress(userAddress)} สำเร็จ`,
      "success"
    );
  } catch (error) {
    resetWalletConnection();

    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    setLoading(false);
  }
}


/* =========================================================
   LOAD CURRENT SETTINGS
========================================================= */

async function loadCurrentSettings() {
  if (!rewardCore || !userAddress) {
    return;
  }

  const [
    contractOwner,
    rewardBps,
    maxUpline,
    claimStep,
    syncPaused,
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

  setText(
    ["contractOwner"],
    shortAddress(contractOwner)
  );

  setText(
    ["currentRewardPercent"],
    formatPercentFromBps(rewardBps)
  );

  setText(
    ["currentMaxUpline"],
    maxUpline.toString()
  );

  setText(
    ["currentClaimStep"],
    `${formatToken(claimStep)} NC`
  );

  setText(
    ["currentSyncStatus"],
    syncPaused
      ? "PAUSED"
      : "ACTIVE"
  );

  const syncStatus =
    document.getElementById(
      "currentSyncStatus"
    );

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
    ["ownerStatus"],
    accessText
  );

  const ownerStatus =
    document.getElementById("ownerStatus");

  if (ownerStatus) {
    ownerStatus.className = accessClass;
  }

  updateActionButtons(syncPaused);
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {
  if (!rewardCore || !userAddress) {
    return;
  }

  try {
    setLoading(true);
    setStatus("กำลังโหลดข้อมูล...");

    await loadCurrentSettings();

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
    setLoading(false);

    try {
      const paused =
        rewardCore
          ? await rewardCore.syncPaused()
          : false;

      updateActionButtons(paused);
    } catch {
      updateActionButtons(false);
    }
  }
}


/* =========================================================
   CREATE PURCHASE ID
========================================================= */

function createPurchaseId(reference) {
  const cleanReference =
    String(reference).trim();

  if (!cleanReference) {
    throw new Error(
      "กรุณากรอก Reference"
    );
  }

  /*
    Reference เดียวกันจะได้ Purchase ID เดิม
    จึงป้องกันการบันทึกซ้ำได้

    แนะนำให้ใช้ Transaction Hash จริงจาก CoreV6
    หรือ Order ID ที่ไม่ซ้ำ
  */

  return ethers.keccak256(
    ethers.toUtf8Bytes(
      cleanReference.toLowerCase()
    )
  );
}


/* =========================================================
   RECORD PURCHASE
========================================================= */

async function recordPurchase() {
  if (!rewardCore || !userAddress) {
    await connectWallet();
    return;
  }

  const buyerInput =
    getInputValue("buyerAddressInput");

  const amountInput =
    getInputValue("purchaseAmountInput");

  const referenceInput =
    getInputValue("purchaseReferenceInput");

  const button =
    document.getElementById(
      "recordPurchaseBtn"
    );

  try {
    if (!isOwner && !isSyncer) {
      throw new Error(
        "กระเป๋านี้ไม่มีสิทธิ์ Record Purchase"
      );
    }

    if (!ethers.isAddress(buyerInput)) {
      throw new Error(
        "Buyer Wallet ไม่ถูกต้อง"
      );
    }

    const buyer =
      ethers.getAddress(buyerInput);

    const amountNumber =
      Number(amountInput);

    if (
      !Number.isFinite(amountNumber) ||
      amountNumber <= 0
    ) {
      throw new Error(
        "กรุณากรอกยอดซื้อให้ถูกต้อง"
      );
    }

    /*
      purchaseAmount ใช้ 18 decimals

      100 USDT  = parseUnits("100", 18)
      500 USDT  = parseUnits("500", 18)
      1000 USDT = parseUnits("1000", 18)
    */

    const purchaseAmount =
      ethers.parseUnits(
        amountInput,
        18
      );

    const purchaseId =
      createPurchaseId(referenceInput);

    const alreadyProcessed =
      await rewardCore.processedPurchases(
        purchaseId
      );

    if (alreadyProcessed) {
      throw new Error(
        "Reference นี้ถูกบันทึกไปแล้ว"
      );
    }

    const confirmed = window.confirm(
      [
        "ยืนยันการบันทึกยอดซื้อ?",
        "",
        `Buyer: ${buyer}`,
        `Amount: ${amountInput} USDT`,
        `Reference: ${referenceInput}`,
        "",
        "รายการนี้ไม่สามารถบันทึกซ้ำได้"
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    if (button) {
      button.disabled = true;
    }

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

    setStatus(
      `บันทึกยอดซื้อ ${amountInput} USDT สำเร็จ`,
      "success"
    );

    clearInput("buyerAddressInput");
    clearInput("purchaseAmountInput");
    clearInput("purchaseReferenceInput");

    await refreshAll();
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    if (button) {
      button.disabled =
        !(isOwner || isSyncer);
    }
  }
}


/* =========================================================
   SET REWARD PERCENT
========================================================= */

async function setRewardPercent() {
  if (!rewardCore || !userAddress) {
    await connectWallet();
    return;
  }

  const inputValue =
    getInputValue("rewardPercentInput");

  const button =
    document.getElementById(
      "setRewardPercentBtn"
    );

  try {
    if (!isOwner) {
      throw new Error(
        "เฉพาะ Owner เท่านั้น"
      );
    }

    const percent =
      Number(inputValue);

    if (
      !Number.isFinite(percent) ||
      percent <= 0 ||
      percent > 10000
    ) {
      throw new Error(
        "Reward ต้องมากกว่า 0 และไม่เกิน 10,000%"
      );
    }

    /*
      100% = 10,000 BPS
      150% = 15,000 BPS
    */

    const newRewardBps =
      BigInt(
        Math.round(percent * 100)
      );

    const confirmed = window.confirm(
      `ยืนยันเปลี่ยน Reward เป็น ${percent}% ?`
    );

    if (!confirmed) {
      return;
    }

    if (button) {
      button.disabled = true;
    }

    setStatus(
      `กำลังเปลี่ยน Reward เป็น ${percent}%...`
    );

    const transaction =
      await rewardCore.setRewardBps(
        newRewardBps
      );

    setStatus(
      "ส่งรายการแล้ว กำลังรอยืนยัน..."
    );

    await transaction.wait();

    setStatus(
      `เปลี่ยน Reward เป็น ${percent}% สำเร็จ`,
      "success"
    );

    clearInput("rewardPercentInput");

    await refreshAll();
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    if (button) {
      button.disabled = !isOwner;
    }
  }
}


/* =========================================================
   SET MAX UPLINE
========================================================= */

async function setMaxUpline() {
  if (!rewardCore || !userAddress) {
    await connectWallet();
    return;
  }

  const inputValue =
    getInputValue("maxUplineInput");

  const button =
    document.getElementById(
      "setMaxUplineBtn"
    );

  try {
    if (!isOwner) {
      throw new Error(
        "เฉพาะ Owner เท่านั้น"
      );
    }

    const levels =
      Number(inputValue);

    if (
      !Number.isInteger(levels) ||
      levels < 1 ||
      levels > 500
    ) {
      throw new Error(
        "จำนวนชั้นต้องเป็นเลข 1 ถึง 500"
      );
    }

    const confirmed = window.confirm(
      `ยืนยันเปลี่ยน Max Upline เป็น ${levels} ชั้น?`
    );

    if (!confirmed) {
      return;
    }

    if (button) {
      button.disabled = true;
    }

    setStatus(
      `กำลังเปลี่ยน Max Upline เป็น ${levels} ชั้น...`
    );

    const transaction =
      await rewardCore.setMaxUpline(
        levels
      );

    setStatus(
      "ส่งรายการแล้ว กำลังรอยืนยัน..."
    );

    await transaction.wait();

    setStatus(
      `เปลี่ยน Max Upline เป็น ${levels} ชั้นสำเร็จ`,
      "success"
    );

    clearInput("maxUplineInput");

    await refreshAll();
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    if (button) {
      button.disabled = !isOwner;
    }
  }
}


/* =========================================================
   SET SYNC PAUSED
========================================================= */

async function setSyncPaused(paused) {
  if (!rewardCore || !userAddress) {
    await connectWallet();
    return;
  }

  try {
    if (!isOwner) {
      throw new Error(
        "เฉพาะ Owner เท่านั้น"
      );
    }

    const action =
      paused
        ? "Pause Sync"
        : "Resume Sync";

    const confirmed = window.confirm(
      `ยืนยัน ${action}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    setStatus(
      paused
        ? "กำลัง Pause ระบบ Sync..."
        : "กำลังเปิดระบบ Sync..."
    );

    const transaction =
      await rewardCore.setSyncPaused(
        paused
      );

    setStatus(
      "ส่งรายการแล้ว กำลังรอยืนยัน..."
    );

    await transaction.wait();

    setStatus(
      paused
        ? "Pause Sync สำเร็จ"
        : "Resume Sync สำเร็จ",
      "success"
    );

    await refreshAll();
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  } finally {
    setLoading(false);
  }
}


/* =========================================================
   COPY BUYER FROM CLIPBOARD (OPTIONAL)
========================================================= */

async function pasteBuyerAddress() {
  try {
    const text =
      await navigator.clipboard.readText();

    if (!ethers.isAddress(text.trim())) {
      throw new Error(
        "ข้อมูลใน Clipboard ไม่ใช่ Wallet Address"
      );
    }

    const input =
      document.getElementById(
        "buyerAddressInput"
      );

    if (input) {
      input.value =
        ethers.getAddress(text.trim());
    }
  } catch (error) {
    setStatus(
      getErrorMessage(error),
      "error"
    );
  }
}


/* =========================================================
   PAGE EVENTS
========================================================= */

function bindEvents() {
  const connectButton =
    document.getElementById(
      "connectWalletBtn"
    );

  const refreshButton =
    document.getElementById(
      "refreshBtn"
    );

  const recordButton =
    document.getElementById(
      "recordPurchaseBtn"
    );

  const setRewardButton =
    document.getElementById(
      "setRewardPercentBtn"
    );

  const setUplineButton =
    document.getElementById(
      "setMaxUplineBtn"
    );

  const pauseSyncButton =
    document.getElementById(
      "pauseSyncBtn"
    );

  const resumeSyncButton =
    document.getElementById(
      "resumeSyncBtn"
    );

  connectButton?.addEventListener(
    "click",
    connectWallet
  );

  refreshButton?.addEventListener(
    "click",
    async () => {
      if (!userAddress) {
        await connectWallet();
        return;
      }

      await refreshAll();
    }
  );

  recordButton?.addEventListener(
    "click",
    recordPurchase
  );

  setRewardButton?.addEventListener(
    "click",
    setRewardPercent
  );

  setUplineButton?.addEventListener(
    "click",
    setMaxUpline
  );

  pauseSyncButton?.addEventListener(
    "click",
    () => setSyncPaused(true)
  );

  resumeSyncButton?.addEventListener(
    "click",
    () => setSyncPaused(false)
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
      resetWalletConnection();

      if (
        !Array.isArray(accounts) ||
        accounts.length === 0
      ) {
        setStatus(
          "กระเป๋าถูกตัดการเชื่อมต่อ"
        );

        return;
      }

      try {
        setLoading(true);

        await ensureBSCNetwork();
        await setActiveAccount(accounts[0]);
        await refreshAll();

        setStatus(
          `เปลี่ยนเป็นกระเป๋า ${shortAddress(userAddress)} แล้ว`,
          "success"
        );
      } catch (error) {
        resetWalletConnection();

        setStatus(
          getErrorMessage(error),
          "error"
        );
      } finally {
        setLoading(false);
      }
    }
  );

  window.ethereum.on?.(
    "chainChanged",
    () => {
      resetWalletConnection();

      setStatus(
        "เครือข่ายถูกเปลี่ยน กรุณากด Connect Wallet"
      );
    }
  );
}


/* =========================================================
   AUTO CONNECT DISABLED
========================================================= */

async function autoConnect() {
  resetWalletConnection();

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


/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    bindEvents();
    bindWalletEvents();
    await autoConnect();
  }
);
