"use strict";

/* =========================================================
   NC REWARD OWNER — OWNER.JS
   ES Module / ethers.js v6
========================================================= */

import {
  connectWallet,
  getRewardCore,
  getUserAddress,
  isWalletConnected,
  isOwnerWallet,
  checkOwnerAccess
} from "./wallet.js";


/* =========================================================
   STATE
========================================================= */

export const ownerState = {
  contractOwner: null,
  rewardBps: 0n,
  maxUpline: 0n,
  claimStep: 0n,
  syncPaused: false,
  refreshing: false,
  recording: false
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

function setStatus(message, type = "") {
  const status = el("appStatus");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className =
    `status ${type}`.trim();
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

function formatNC(
  value,
  maximumDecimals = 2
) {
  try {
    const formatted =
      ethers.formatUnits(
        value ?? 0n,
        18
      );

    const number =
      Number(formatted);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits:
          maximumDecimals
      }
    );

  } catch (error) {

    console.warn(
      "formatNC error:",
      error
    );

    return "0";
  }
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
    String(message)
      .toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes(
      "rejected the request"
    )
  ) {
    return "ผู้ใช้ยกเลิกรายการ";
  }

  if (
    lower.includes(
      "insufficient funds"
    )
  ) {
    return "BNB ไม่เพียงพอสำหรับค่า Gas";
  }

  if (
    lower.includes(
      "execution reverted"
    )
  ) {
    return String(message)
      .replace(
        /execution reverted:?/i,
        ""
      )
      .trim();
  }

  return String(message);
}


/* =========================================================
   RESET OWNER UI
========================================================= */

export function resetOwnerUI() {

  ownerState.contractOwner = null;
  ownerState.rewardBps = 0n;
  ownerState.maxUpline = 0n;
  ownerState.claimStep = 0n;
  ownerState.syncPaused = false;

  setText(
    "contractOwner",
    "-"
  );

  setText(
    "currentRewardPercent",
    "-"
  );

  setText(
    "currentMaxUpline",
    "-"
  );

  setText(
    "currentClaimStep",
    "-"
  );

  setText(
    "currentSyncStatus",
    "-"
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
   LOAD OWNER DATA
========================================================= */

export async function refreshOwnerData() {

  if (
    !isWalletConnected() ||
    ownerState.refreshing
  ) {
    return;
  }

  const rewardCore =
    getRewardCore();

  if (!rewardCore) {
    throw new Error(
      "ไม่พบ Reward Core Contract"
    );
  }

  ownerState.refreshing = true;

  setDisabled(
    "refreshBtn",
    true
  );

  try {

    setStatus(
      "กำลังโหลดข้อมูล..."
    );

    await checkOwnerAccess();

    const [
      contractOwner,
      rewardBps,
      maxUpline,
      claimStep,
      syncPaused
    ] = await Promise.all([

      rewardCore.owner(),

      rewardCore.rewardBps(),

      rewardCore.maxUpline(),

      rewardCore.claimStep(),

      rewardCore.syncPaused()

    ]);


    ownerState.contractOwner =
      ethers.getAddress(
        contractOwner
      );

    ownerState.rewardBps =
      rewardBps;

    ownerState.maxUpline =
      maxUpline;

    ownerState.claimStep =
      claimStep;

    ownerState.syncPaused =
      Boolean(syncPaused);


    /* -------------------------
       CONTRACT OWNER
    ------------------------- */

    setText(
      "contractOwner",
      shortAddress(
        ownerState.contractOwner
      )
    );


    /* -------------------------
       REWARD %
       10000 BPS = 100%
    ------------------------- */

    const rewardPercent =
      Number(
        ownerState.rewardBps
      ) / 100;

    setText(
      "currentRewardPercent",
      `${rewardPercent.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 2
        }
      )}%`
    );


    /* -------------------------
       MAX UPLINE
    ------------------------- */

    setText(
      "currentMaxUpline",
      ownerState.maxUpline
        .toString()
    );


    /* -------------------------
       CLAIM STEP
    ------------------------- */

    setText(
      "currentClaimStep",
      `${formatNC(
        ownerState.claimStep
      )} NC`
    );


    /* -------------------------
       SYNC STATUS
    ------------------------- */

    setText(
      "currentSyncStatus",
      ownerState.syncPaused
        ? "Paused"
        : "Active"
    );


    /* -------------------------
       ACCESS
    ------------------------- */

    if (isOwnerWallet()) {

      setStatus(
        ownerState.syncPaused
          ? "Owner Connected — Sync Paused"
          : "Owner Connected — Ready",
        ownerState.syncPaused
          ? "warning"
          : "success"
      );

      setDisabled(
        "refreshBtn",
        false
      );

      /*
        ถ้า Sync Pause อยู่
        ไม่ให้ Record Purchase
      */

      setDisabled(
        "recordPurchaseBtn",
        ownerState.syncPaused
      );

    } else {

      setStatus(
        "Wallet นี้ไม่ใช่ Owner",
        "error"
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

  } catch (error) {

    setStatus(
      `โหลดข้อมูลไม่สำเร็จ: ${getErrorMessage(
        error
      )}`,
      "error"
    );

  } finally {

    ownerState.refreshing = false;

    if (
      isOwnerWallet()
    ) {
      setDisabled(
        "refreshBtn",
        false
      );
    }
  }
}


/* =========================================================
   VALIDATE PURCHASE INPUT
========================================================= */

function getPurchaseInput() {

  const buyerRaw =
    el("buyerAddressInput")
      ?.value
      ?.trim();

  const amountRaw =
    el("purchaseAmountInput")
      ?.value
      ?.trim();

  const txHashRaw =
    el("purchaseReferenceInput")
      ?.value
      ?.trim();


  /* -------------------------
     BUYER
  ------------------------- */

  if (!buyerRaw) {
    throw new Error(
      "กรุณากรอก Buyer Wallet"
    );
  }

  if (
    !ethers.isAddress(
      buyerRaw
    )
  ) {
    throw new Error(
      "Buyer Wallet ไม่ถูกต้อง"
    );
  }

  const buyer =
    ethers.getAddress(
      buyerRaw
    );


  /* -------------------------
     AMOUNT
  ------------------------- */

  if (!amountRaw) {
    throw new Error(
      "กรุณากรอก Purchase Amount"
    );
  }

  const amountNumber =
    Number(amountRaw);

  if (
    !Number.isFinite(
      amountNumber
    ) ||
    amountNumber <= 0
  ) {
    throw new Error(
      "Purchase Amount ต้องมากกว่า 0"
    );
  }

  /*
    USDT บน BSC ที่ระบบนี้ใช้
    เป็น 18 decimals
  */

  const purchaseAmount =
    ethers.parseUnits(
      amountRaw,
      18
    );


  /* -------------------------
     TRANSACTION HASH
  ------------------------- */

  if (!txHashRaw) {
    throw new Error(
      "กรุณากรอก Transaction Hash"
    );
  }

  /*
    BSC Transaction Hash
    ต้องเป็น bytes32
    = 0x + 64 hex characters
  */

  if (
    !ethers.isHexString(
      txHashRaw,
      32
    )
  ) {
    throw new Error(
      "Transaction Hash ไม่ถูกต้อง"
    );
  }

  return {
    buyer,
    purchaseAmount,
    transactionHash:
      txHashRaw
  };
}


/* =========================================================
   RECORD PURCHASE
========================================================= */

export async function recordPurchase() {

  if (ownerState.recording) {
    return;
  }

  try {

    /* -------------------------
       WALLET CHECK
    ------------------------- */

    if (
      !isWalletConnected()
    ) {
      await connectWallet();
    }

    if (
      !isOwnerWallet()
    ) {
      throw new Error(
        "Wallet นี้ไม่ใช่ Owner"
      );
    }


    const rewardCore =
      getRewardCore();

    const userAddress =
      getUserAddress();

    if (
      !rewardCore ||
      !userAddress
    ) {
      throw new Error(
        "กรุณาเชื่อม Wallet"
      );
    }


    /* -------------------------
       SYNC CHECK
    ------------------------- */

    const syncPaused =
      await rewardCore
        .syncPaused();

    if (syncPaused) {
      throw new Error(
        "ระบบ Sync ถูก Pause อยู่"
      );
    }


    /* -------------------------
       INPUT
    ------------------------- */

    const {
      buyer,
      purchaseAmount,
      transactionHash
    } = getPurchaseInput();


    ownerState.recording =
      true;

    setDisabled(
      "recordPurchaseBtn",
      true
    );

    setDisabled(
      "refreshBtn",
      true
    );


    /* =====================================================
       CREATE PURCHASE ID

       HTML ปัจจุบันรับเพียง
       Transaction Hash

       จึงใช้ logIndex = 0

       purchaseId =
       makePurchaseId(txHash, 0)
    ===================================================== */

    setStatus(
      "กำลังสร้าง Purchase ID..."
    );

    const purchaseId =
      await rewardCore
        .makePurchaseId(
          transactionHash,
          0
        );


    /* =====================================================
       DUPLICATE CHECK
    ===================================================== */

    setStatus(
      "กำลังตรวจสอบ Transaction..."
    );

    const alreadyProcessed =
      await rewardCore
        .processedPurchases(
          purchaseId
        );

    if (alreadyProcessed) {
      throw new Error(
        "Transaction Hash นี้ถูกบันทึกแล้ว"
      );
    }


    /* =====================================================
       CONFIRM DETAILS
    ===================================================== */

    const readableAmount =
      formatNC(
        purchaseAmount,
        6
      );

    setStatus(
      `กำลังบันทึก ${readableAmount} USDT...`
    );


    /* =====================================================
       RECORD PURCHASE
    ===================================================== */

    const transaction =
      await rewardCore
        .recordPurchase(
          purchaseId,
          buyer,
          purchaseAmount
        );


    /* =====================================================
       WAIT CONFIRMATION
    ===================================================== */

    setStatus(
      "ส่ง Transaction แล้ว กำลังรอยืนยัน..."
    );

    await transaction.wait();


    /* =====================================================
       SUCCESS
    ===================================================== */

    setStatus(
      "Record Purchase สำเร็จ",
      "success"
    );


    /* -------------------------
       CLEAR INPUT
    ------------------------- */

    const buyerInput =
      el("buyerAddressInput");

    const amountInput =
      el("purchaseAmountInput");

    const referenceInput =
      el(
        "purchaseReferenceInput"
      );

    if (buyerInput) {
      buyerInput.value = "";
    }

    if (amountInput) {
      amountInput.value = "";
    }

    if (referenceInput) {
      referenceInput.value = "";
    }


    /* -------------------------
       REFRESH
    ------------------------- */

    await refreshOwnerData();


  } catch (error) {

    setStatus(
      getErrorMessage(error),
      "error"
    );

  } finally {

    ownerState.recording =
      false;

    if (
      isOwnerWallet() &&
      !ownerState.syncPaused
    ) {
      setDisabled(
        "recordPurchaseBtn",
        false
      );
    }

    if (
      isOwnerWallet()
    ) {
      setDisabled(
        "refreshBtn",
        false
      );
    }
  }
}


/* =========================================================
   EVENTS
========================================================= */

function bindOwnerEvents() {

  /* -------------------------
     REFRESH
  ------------------------- */

  el("refreshBtn")
    ?.addEventListener(
      "click",
      refreshOwnerData
    );


  /* -------------------------
     RECORD PURCHASE
  ------------------------- */

  el("recordPurchaseBtn")
    ?.addEventListener(
      "click",
      recordPurchase
    );


  /* -------------------------
     WALLET CONNECTED
  ------------------------- */

  document.addEventListener(
    "walletConnected",
    async () => {

      await refreshOwnerData();

    }
  );


  /* -------------------------
     WALLET DISCONNECTED
  ------------------------- */

  document.addEventListener(
    "walletDisconnected",
    () => {

      resetOwnerUI();

    }
  );
}


/* =========================================================
   INIT OWNER
========================================================= */

export function initOwner() {

  resetOwnerUI();

  bindOwnerEvents();

  return true;
}
