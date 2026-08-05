"use strict";

/* =========================================================
   NC REWARD DAPP — REWARD.JS
   Dashboard / Rank / Progress / Claim & Auto Stake
========================================================= */

import {
  connectWallet,
  getContracts,
  getUserAddress,
  isWalletConnected
} from "./wallet.js";


/* =========================================================
   REWARD STATE
========================================================= */

export const rewardState = {
  claimStep: 0n,
  organizationTarget: 0n,
  rewardBps: 0n,

  claimPaused: false,
  distributionPaused: false,
  syncPaused: false,

  personalVolume: 0n,
  organizationVolume: 0n,

  totalRewardEarned: 0n,
  totalRewardStaked: 0n,

  pendingReward: 0n,
  claimableReward: 0n,
  remainingReward: 0n,

  currentRank: 0,

  goldQualified: false,
  organizationQualified: false,
  claimQualified: false,

  refreshing: false
};


/* =========================================================
   ELEMENT HELPERS
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

function setDisabled(id, disabled) {
  const element = getElement(id);

  if (element) {
    element.disabled = disabled;
  }
}

function showElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.remove("hidden");
  }
}

function hideElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.add("hidden");
  }
}


/* =========================================================
   FORMATTERS
========================================================= */

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

function rankName(rank) {
  const rankNumber =
    Number(rank ?? 0);

  if (
    window.RANK_NAMES?.[
      rankNumber
    ] !== undefined
  ) {
    return window.RANK_NAMES[
      rankNumber
    ];
  }

  const fallbackRanks = [
    "None",
    "Bronze",
    "Silver",
    "Gold"
  ];

  return (
    fallbackRanks[rankNumber] ||
    `Rank ${rankNumber}`
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
    lowerMessage.includes(
      "user rejected"
    ) ||
    lowerMessage.includes(
      "user denied"
    ) ||
    lowerMessage.includes(
      "rejected the request"
    )
  ) {
    return "ผู้ใช้ยกเลิกรายการ";
  }

  if (
    lowerMessage.includes(
      "insufficient funds"
    )
  ) {
    return "BNB ไม่เพียงพอสำหรับค่า Gas";
  }

  if (
    lowerMessage.includes(
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
    console.log(
      title,
      message
    );

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
      6000
    );
}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
  active,
  message = "กำลังโหลด..."
) {
  setText(
    "loadingText",
    message
  );

  if (active) {
    showElement(
      "loadingOverlay"
    );
  } else {
    hideElement(
      "loadingOverlay"
    );
  }
}


/* =========================================================
   CLAIM STATUS
========================================================= */

function setClaimStatus(
  text,
  className =
    "status-warning"
) {
  const element =
    getElement("claimStatus");

  if (!element) {
    return;
  }

  element.textContent =
    text;

  element.className =
    className;
}


/* =========================================================
   RESET REWARD UI
========================================================= */

export function resetRewardUI() {
  rewardState.claimStep = 0n;
  rewardState.organizationTarget = 0n;
  rewardState.rewardBps = 0n;

  rewardState.claimPaused = false;
  rewardState.distributionPaused =
    false;
  rewardState.syncPaused = false;

  rewardState.personalVolume = 0n;
  rewardState.organizationVolume =
    0n;

  rewardState.totalRewardEarned =
    0n;
  rewardState.totalRewardStaked =
    0n;

  rewardState.pendingReward = 0n;
  rewardState.claimableReward = 0n;
  rewardState.remainingReward = 0n;

  rewardState.currentRank = 0;

  rewardState.goldQualified = false;
  rewardState.organizationQualified =
    false;
  rewardState.claimQualified = false;

  setText(
    "userRank",
    "-"
  );

  setText(
    "organizationVolume",
    "0 NC"
  );

  setText(
    "claimableReward",
    "0 NC"
  );

  setText(
    "claimableUnits",
    "0"
  );

  setText(
    "totalClaimed",
    "0 NC"
  );

  setText(
    "totalStaked",
    "0 NC"
  );

  setText(
    "currentProgressText",
    "0 / 20,000 NC"
  );

  setText(
    "progressPercent",
    "0%"
  );

  setText(
    "claimStep",
    "20,000 NC"
  );

  setText(
    "organizationTarget",
    "20,000 NC"
  );

  setText(
    "rewardRate",
    "100%"
  );

  setText(
    "rankQualified",
    "No"
  );

  setText(
    "volumeQualified",
    "No"
  );

  setText(
    "distributionStatus",
    "Checking..."
  );

  setText(
    "claimPauseStatus",
    "Checking..."
  );

  setText(
    "claimAmountDisplay",
    "0 NC"
  );

  const progressBar =
    getElement(
      "organizationProgressBar"
    );

  if (progressBar) {
    progressBar.style.width =
      "0%";
  }

  setClaimStatus(
    "Connect Wallet",
    "status-warning"
  );

  setDisabled(
    "claimAndStakeBtn",
    true
  );

  setText(
    "claimAndStakeBtn",
    "Claim & Auto Stake"
  );
}


/* =========================================================
   LOAD SYSTEM SETTINGS
========================================================= */

async function loadSystemSettings() {
  const {
    rewardCore,
    rewardVault
  } = getContracts();

  if (
    !rewardCore ||
    !rewardVault
  ) {
    throw new Error(
      "ยังไม่ได้เชื่อม Contract"
    );
  }

  const [
    claimStep,
    organizationTarget,
    rewardBps,
    claimPaused,
    syncPaused,
    distributionPaused
  ] = await Promise.all([
    rewardCore.claimStep(),

    rewardCore
      .requiredOrganizationVolume(),

    rewardCore.rewardBps(),

    rewardCore.claimPaused(),

    rewardCore.syncPaused(),

    rewardVault
      .distributionPaused()
  ]);

  rewardState.claimStep =
    claimStep;

  rewardState.organizationTarget =
    organizationTarget;

  rewardState.rewardBps =
    rewardBps;

  rewardState.claimPaused =
    Boolean(claimPaused);

  rewardState.syncPaused =
    Boolean(syncPaused);

  rewardState.distributionPaused =
    Boolean(distributionPaused);

  setText(
    "claimStep",
    `${formatNC(
      claimStep
    )} NC`
  );

  setText(
    "organizationTarget",
    `${formatNC(
      organizationTarget
    )} NC`
  );

  const rewardPercent =
    Number(rewardBps) / 100;

  setText(
    "rewardRate",
    `${rewardPercent.toLocaleString(
      "en-US"
    )}%`
  );

  setText(
    "distributionStatus",
    distributionPaused
      ? "Paused"
      : "Active"
  );

  setText(
    "claimPauseStatus",
    claimPaused
      ? "Paused"
      : "Active"
  );
}


/* =========================================================
   LOAD USER REWARD INFO
========================================================= */

async function loadUserRewardInfo() {
  const {
    rewardCore
  } = getContracts();

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

  const info =
    await rewardCore
      .getUserRewardInfo(
        userAddress
      );

  rewardState.personalVolume =
    info.personalVolume ??
    info[0];

  rewardState.organizationVolume =
    info.orgVolume ??
    info[1];

  rewardState.totalRewardEarned =
    info.totalRewardEarned ??
    info[2];

  rewardState.totalRewardStaked =
    info.totalRewardStaked ??
    info[3];

  rewardState.pendingReward =
    info.pending ??
    info[4];

  rewardState.claimableReward =
    info.claimable ??
    info[5];

  rewardState.remainingReward =
    info.remainingAfterClaim ??
    info[6];

  rewardState.currentRank =
    Number(
      info.currentRank ??
      info[7]
    );

  rewardState.goldQualified =
    Boolean(
      info.goldQualified ??
      info[8]
    );

  rewardState.organizationQualified =
    Boolean(
      info.orgQualified ??
      info[9]
    );

  rewardState.claimQualified =
    Boolean(
      info.claimQualified ??
      info[10]
    );
}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {
  setText(
    "userRank",
    rankName(
      rewardState.currentRank
    )
  );

  setText(
    "organizationVolume",
    `${formatNC(
      rewardState
        .organizationVolume
    )} NC`
  );

  setText(
    "claimableReward",
    `${formatNC(
      rewardState
        .claimableReward
    )} NC`
  );

  setText(
    "totalClaimed",
    `${formatNC(
      rewardState
        .totalRewardStaked
    )} NC`
  );

  setText(
    "totalStaked",
    `${formatNC(
      rewardState
        .totalRewardStaked
    )} NC`
  );

  setText(
    "claimAmountDisplay",
    `${formatNC(
      rewardState
        .claimableReward
    )} NC`
  );

  let claimableUnits = 0n;

  if (
    rewardState.claimStep > 0n
  ) {
    claimableUnits =
      rewardState
        .claimableReward /
      rewardState.claimStep;
  }

  setText(
    "claimableUnits",
    claimableUnits.toString()
  );

  setText(
    "rankQualified",
    rewardState.goldQualified
      ? "Yes"
      : "No"
  );

  setText(
    "volumeQualified",
    rewardState
      .organizationQualified
      ? "Yes"
      : "No"
  );
}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgress() {
  const step =
    rewardState.claimStep > 0n
      ? rewardState.claimStep
      : rewardState
          .organizationTarget;

  let currentProgress = 0n;

  if (step > 0n) {
    currentProgress =
      rewardState.pendingReward %
      step;
  }

  let percentage = 0;

  if (step > 0n) {
    percentage =
      Number(
        currentProgress *
        10000n /
        step
      ) / 100;
  }

  percentage =
    Math.min(
      100,
      Math.max(
        0,
        percentage
      )
    );

  setText(
    "currentProgressText",
    `${formatNC(
      currentProgress
    )} / ${formatNC(
      step
    )} NC`
  );

  setText(
    "progressPercent",
    `${percentage.toFixed(
      2
    )}%`
  );

  const progressBar =
    getElement(
      "organizationProgressBar"
    );

  if (progressBar) {
    progressBar.style.width =
      `${percentage}%`;
  }
}


/* =========================================================
   UPDATE CLAIM BUTTON
========================================================= */

function updateClaimButton() {
  const button =
    getElement(
      "claimAndStakeBtn"
    );

  if (!button) {
    return;
  }

  const hasReward =
    rewardState.claimableReward >
    0n;

  const claimEnabled =
    rewardState.claimQualified &&
    rewardState.goldQualified &&
    rewardState
      .organizationQualified &&
    hasReward &&
    !rewardState.claimPaused &&
    !rewardState
      .distributionPaused;

  button.disabled =
    !claimEnabled;

  if (claimEnabled) {
    setClaimStatus(
      "Ready to Claim",
      "status-success"
    );

    button.textContent =
      `Claim ${formatNC(
        rewardState
          .claimableReward
      )} NC & Auto Stake`;

    return;
  }

  if (
    rewardState.claimPaused
  ) {
    setClaimStatus(
      "Claim Paused",
      "status-warning"
    );

    button.textContent =
      "ระบบ Claim ถูกหยุด";

    return;
  }

  if (
    rewardState
      .distributionPaused
  ) {
    setClaimStatus(
      "Distribution Paused",
      "status-warning"
    );

    button.textContent =
      "คลังรางวัลถูกหยุด";

    return;
  }

  if (
    !rewardState.goldQualified
  ) {
    setClaimStatus(
      "Gold Rank Required",
      "status-warning"
    );

    button.textContent =
      "ต้องเป็น Gold ก่อน";

    return;
  }

  if (
    !rewardState
      .organizationQualified
  ) {
    setClaimStatus(
      "Volume Not Qualified",
      "status-warning"
    );

    button.textContent =
      "ยอดองค์กรยังไม่ถึงเงื่อนไข";

    return;
  }

  if (!hasReward) {
    setClaimStatus(
      "No Claimable Reward",
      "status-warning"
    );

    button.textContent =
      "ยังไม่มี Reward ที่เคลมได้";

    return;
  }

  setClaimStatus(
    "Not Qualified",
    "status-warning"
  );

  button.textContent =
    "ยังไม่สามารถ Claim ได้";
}


/* =========================================================
   LOAD NC BALANCE
========================================================= */

async function loadNCBalance() {
  const {
    ncToken
  } = getContracts();

  const userAddress =
    getUserAddress();

  if (
    !ncToken ||
    !userAddress
  ) {
    return;
  }

  const balance =
    await ncToken.balanceOf(
      userAddress
    );

  setText(
    "ncBalance",
    `${formatNC(
      balance
    )} NC`
  );
}


/* =========================================================
   REFRESH REWARD
========================================================= */

export async function refreshReward() {
  if (
    !isWalletConnected() ||
    rewardState.refreshing
  ) {
    return;
  }

  rewardState.refreshing =
    true;

  setDisabled(
    "refreshBtn",
    true
  );

  try {
    await Promise.all([
      loadSystemSettings(),
      loadNCBalance()
    ]);

    await loadUserRewardInfo();

    updateDashboard();
    updateProgress();
    updateClaimButton();
  } catch (error) {
    showNotification(
      "โหลด Reward ไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );

    throw error;
  } finally {
    rewardState.refreshing =
      false;

    setDisabled(
      "refreshBtn",
      false
    );
  }
}


/* =========================================================
   CLAIM & AUTO STAKE
========================================================= */

export async function claimReward() {
  try {
    if (
      !isWalletConnected()
    ) {
      await connectWallet();
    }

    const {
      rewardCore
    } = getContracts();

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

    setDisabled(
      "claimAndStakeBtn",
      true
    );

    setLoading(
      true,
      "กำลังตรวจสอบสิทธิ์ Claim..."
    );

    const canClaim =
      await rewardCore.canClaim(
        userAddress
      );

    if (!canClaim) {
      throw new Error(
        "ยังไม่ผ่านเงื่อนไข Claim"
      );
    }

    setLoading(
      true,
      "กำลังส่งคำสั่ง Claim และ Auto Stake..."
    );

    const transaction =
      await rewardCore
        .claimAndStake();

    setLoading(
      true,
      "กำลังรอยืนยันบน Blockchain..."
    );

    await transaction.wait();

    showNotification(
      "สำเร็จ",
      "Claim และ Auto Stake สำเร็จ",
      "success"
    );

    await refreshReward();

    document.dispatchEvent(
      new CustomEvent(
        "rewardClaimed"
      )
    );
  } catch (error) {
    showNotification(
      "Claim ไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );
  } finally {
    setLoading(false);

    updateClaimButton();
  }
}


/* =========================================================
   REWARD EVENTS
========================================================= */

function bindRewardEvents() {
  const claimButton =
    getElement(
      "claimAndStakeBtn"
    );

  claimButton
    ?.addEventListener(
      "click",
      claimReward
    );

  const refreshButton =
    getElement(
      "refreshBtn"
    );

  refreshButton
    ?.addEventListener(
      "click",
      async () => {
        if (
          !isWalletConnected()
        ) {
          await connectWallet();
          return;
        }

        await refreshReward();
      }
    );

  document.addEventListener(
    "walletConnected",
    async () => {
      await refreshReward();
    }
  );

  document.addEventListener(
    "walletDisconnected",
    () => {
      resetRewardUI();
    }
  );
}


/* =========================================================
   INITIALIZE REWARD MODULE
========================================================= */

export function initReward() {
  resetRewardUI();

  bindRewardEvents();

  return true;
}
