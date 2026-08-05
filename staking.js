"use strict";

/* =========================================================
   NC REWARD DAPP — STAKING.JS
   Stake Lots / Countdown / Withdraw
========================================================= */

import {
  connectWallet,
  getContracts,
  getUserAddress,
  isWalletConnected
} from "./wallet.js";


/* =========================================================
   STAKING STATE
========================================================= */

export const stakingState = {
  lots: [],
  page: 1,
  totalLots: 0,
  activeLots: 0,
  maturedLots: 0,
  withdrawnLots: 0,
  withdrawableAmount: 0n,
  countdownTimer: null,
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

function formatDate(timestamp) {
  const value = Number(
    timestamp ?? 0
  );

  if (!value) {
    return "-";
  }

  return new Date(
    value * 1000
  ).toLocaleString(
    "th-TH"
  );
}

function formatCountdown(seconds) {
  let remaining =
    Math.max(
      0,
      Math.floor(
        Number(seconds ?? 0)
      )
    );

  const days =
    Math.floor(
      remaining / 86400
    );

  remaining %= 86400;

  const hours =
    Math.floor(
      remaining / 3600
    );

  remaining %= 3600;

  const minutes =
    Math.floor(
      remaining / 60
    );

  const secs =
    remaining % 60;

  if (days > 0) {
    return (
      `${days} วัน ` +
      `${hours} ชม. ` +
      `${minutes} นาที`
    );
  }

  return (
    `${hours} ชม. ` +
    `${minutes} นาที ` +
    `${secs} วินาที`
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
    String(message)
      .toLowerCase();

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
        notification
          .classList
          .add("hidden");
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
   RESET STAKING UI
========================================================= */

export function resetStakingUI() {
  stakingState.lots = [];
  stakingState.page = 1;
  stakingState.totalLots = 0;
  stakingState.activeLots = 0;
  stakingState.maturedLots = 0;
  stakingState.withdrawnLots = 0;
  stakingState.withdrawableAmount = 0n;

  stopCountdown();

  setText(
    "activeStakeLots",
    "0"
  );

  setText(
    "maturedStakeLots",
    "0"
  );

  setText(
    "totalWithdrawn",
    "0 NC"
  );

  setText(
    "lockDuration",
    "365 Days"
  );

  setText(
    "stakeLotCount",
    "0 Lots"
  );

  setDisabled(
    "withdrawMaturedBtn",
    true
  );

  setText(
    "stakePageText",
    "Page 1"
  );

  hideElement(
    "stakePagination"
  );

  const container =
    getElement(
      "stakeLotsContainer"
    );

  if (container) {
    container.innerHTML = `
      <div class="empty-box">
        <div>🔒</div>

        <strong>
          ยังไม่มีรายการ Stake
        </strong>

        <p>
          รายการ Stake จะแสดงหลังจากเคลมรางวัลสำเร็จ
        </p>
      </div>
    `;
  }
}


/* =========================================================
   LOAD STAKING SUMMARY
========================================================= */

async function loadStakingSummary() {
  const {
    rewardStaking
  } = getContracts();

  const userAddress =
    getUserAddress();

  if (
    !rewardStaking ||
    !userAddress
  ) {
    throw new Error(
      "กรุณาเชื่อม Wallet"
    );
  }

  const [
    summary,
    withdrawableAmount,
    totalWithdrawn,
    lockDuration
  ] = await Promise.all([
    rewardStaking
      .userStakeSummary(
        userAddress
      ),

    rewardStaking
      .withdrawableAmount(
        userAddress
      ),

    rewardStaking
      .totalWithdrawn(),

    rewardStaking
      .lockDuration()
  ]);

  stakingState.totalLots =
    Number(
      summary.totalLots ??
      summary[0]
    );

  stakingState.activeLots =
    Number(
      summary.activeLots ??
      summary[1]
    );

  stakingState.withdrawnLots =
    Number(
      summary.withdrawnLots ??
      summary[2]
    );

  stakingState.withdrawableAmount =
    withdrawableAmount;

  const lockDays =
    Math.floor(
      Number(lockDuration) /
      86400
    );

  setText(
    "activeStakeLots",
    stakingState
      .activeLots
      .toString()
  );

  setText(
    "totalWithdrawn",
    `${formatNC(
      totalWithdrawn
    )} NC`
  );

  setText(
    "lockDuration",
    `${lockDays} Days`
  );

  setText(
    "stakeLotCount",
    `${stakingState.totalLots} Lots`
  );

  setDisabled(
    "withdrawMaturedBtn",
    withdrawableAmount === 0n
  );
}


/* =========================================================
   LOAD STAKE LOTS
========================================================= */

async function loadStakeLots() {
  const {
    rewardStaking
  } = getContracts();

  const userAddress =
    getUserAddress();

  if (
    !rewardStaking ||
    !userAddress
  ) {
    throw new Error(
      "กรุณาเชื่อม Wallet"
    );
  }

  const count =
    Number(
      await rewardStaking
        .stakeLotsCount(
          userAddress
        )
    );

  const lots = [];
  let maturedLots = 0;

  for (
    let index = 0;
    index < count;
    index++
  ) {
    try {
      const lot =
        await rewardStaking
          .getStakeLot(
            userAddress,
            index
          );

      const normalizedLot = {
        index,

        principal:
          lot.principal ??
          lot[0],

        startedAt:
          lot.startedAt ??
          lot[1],

        unlockAt:
          lot.unlockAt ??
          lot[2],

        withdrawn:
          Boolean(
            lot.withdrawn ??
            lot[3]
          ),

        matured:
          Boolean(
            lot.matured ??
            lot[4]
          ),

        remainingSeconds:
          lot.remainingSeconds ??
          lot[5]
      };

      if (
        normalizedLot.matured &&
        !normalizedLot.withdrawn
      ) {
        maturedLots++;
      }

      lots.push(
        normalizedLot
      );
    } catch (error) {
      console.warn(
        `โหลด Stake #${index + 1} ไม่สำเร็จ`,
        error
      );
    }
  }

  stakingState.lots =
    lots;

  stakingState.totalLots =
    lots.length;

  stakingState.maturedLots =
    maturedLots;

  setText(
    "maturedStakeLots",
    maturedLots.toString()
  );

  setText(
    "stakeLotCount",
    `${lots.length} Lots`
  );
}


/* =========================================================
   CREATE STAKE LOT HTML
========================================================= */

function createStakeLotHTML(lot) {
  let statusText =
    "กำลังล็อก";

  let buttonText =
    "ยังไม่ครบกำหนด";

  let buttonDisabled =
    true;

  if (lot.withdrawn) {
    statusText =
      "ถอนแล้ว";

    buttonText =
      "ถอนแล้ว";
  } else if (lot.matured) {
    statusText =
      "พร้อมถอน";

    buttonText =
      "Withdraw";

    buttonDisabled =
      false;
  }

  let countdownText;

  if (lot.withdrawn) {
    countdownText =
      "ถอนแล้ว";
  } else if (lot.matured) {
    countdownText =
      "พร้อมถอน";
  } else {
    countdownText =
      formatCountdown(
        lot.remainingSeconds
      );
  }

  return `
    <div class="stake-lot">

      <div class="stake-lot-head">

        <strong>
          Stake #${lot.index + 1}
        </strong>

        <span>
          ${statusText}
        </span>

      </div>


      <div class="stake-lot-grid">

        <div>
          <small>
            Principal
          </small>

          <b>
            ${formatNC(
              lot.principal
            )} NC
          </b>
        </div>


        <div>
          <small>
            เริ่ม Stake
          </small>

          <b>
            ${formatDate(
              lot.startedAt
            )}
          </b>
        </div>


        <div>
          <small>
            วันปลดล็อก
          </small>

          <b>
            ${formatDate(
              lot.unlockAt
            )}
          </b>
        </div>


        <div>
          <small>
            เวลาคงเหลือ
          </small>

          <b
            class="lot-countdown"
            data-unlock="${lot.unlockAt}"
            data-withdrawn="${lot.withdrawn}"
          >
            ${countdownText}
          </b>
        </div>

      </div>


      <div class="stake-lot-action">

        <button
          class="secondary-btn withdraw-lot-btn"
          data-index="${lot.index}"
          type="button"
          ${buttonDisabled ? "disabled" : ""}
        >
          ${buttonText}
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER STAKE LOTS
========================================================= */

function renderStakeLots() {
  const container =
    getElement(
      "stakeLotsContainer"
    );

  if (!container) {
    return;
  }

  if (
    stakingState.lots.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-box">
        <div>🔒</div>

        <strong>
          ยังไม่มีรายการ Stake
        </strong>

        <p>
          รายการ Stake จะแสดงหลังจากเคลมรางวัลสำเร็จ
        </p>
      </div>
    `;

    hideElement(
      "stakePagination"
    );

    return;
  }

  const pageSize =
    window.APP_CONFIG
      ?.STAKE_PAGE_SIZE ||
    5;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        stakingState
          .lots
          .length /
        pageSize
      )
    );

  if (
    stakingState.page >
    totalPages
  ) {
    stakingState.page =
      totalPages;
  }

  const startIndex =
    (
      stakingState.page -
      1
    ) *
    pageSize;

  const pageLots =
    stakingState
      .lots
      .slice(
        startIndex,
        startIndex +
        pageSize
      );

  container.innerHTML =
    pageLots
      .map(
        createStakeLotHTML
      )
      .join("");

  setText(
    "stakePageText",
    `Page ${stakingState.page} / ${totalPages}`
  );

  setDisabled(
    "stakePrevBtn",
    stakingState.page <= 1
  );

  setDisabled(
    "stakeNextBtn",
    stakingState.page >=
      totalPages
  );

  showElement(
    "stakePagination"
  );
}


/* =========================================================
   COUNTDOWN
========================================================= */

function updateCountdowns() {
  const currentTime =
    Math.floor(
      Date.now() /
      1000
    );

  const elements =
    document.querySelectorAll(
      ".lot-countdown"
    );

  elements.forEach(
    (element) => {
      const withdrawn =
        element.dataset
          .withdrawn ===
        "true";

      if (withdrawn) {
        element.textContent =
          "ถอนแล้ว";

        return;
      }

      const unlockAt =
        Number(
          element.dataset
            .unlock
        );

      const remaining =
        unlockAt -
        currentTime;

      if (
        remaining <= 0
      ) {
        element.textContent =
          "พร้อมถอน";

        return;
      }

      element.textContent =
        formatCountdown(
          remaining
        );
    }
  );
}

function startCountdown() {
  stopCountdown();

  updateCountdowns();

  stakingState.countdownTimer =
    window.setInterval(
      updateCountdowns,
      3000
    );
}

function stopCountdown() {
  if (
    stakingState.countdownTimer
  ) {
    window.clearInterval(
      stakingState
        .countdownTimer
    );

    stakingState.countdownTimer =
      null;
  }
}


/* =========================================================
   REFRESH STAKING
========================================================= */

export async function refreshStaking() {
  if (
    !isWalletConnected() ||
    stakingState.refreshing
  ) {
    return;
  }

  stakingState.refreshing =
    true;

  try {
    await loadStakingSummary();

    await loadStakeLots();

    renderStakeLots();

    startCountdown();
  } catch (error) {
    showNotification(
      "โหลด Stake ไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );

    throw error;
  } finally {
    stakingState.refreshing =
      false;
  }
}


/* =========================================================
   WITHDRAW ONE LOT
========================================================= */

export async function withdrawStakeLot(
  lotIndex
) {
  try {
    if (
      !isWalletConnected()
    ) {
      await connectWallet();
    }

    const {
      rewardStaking
    } = getContracts();

    if (!rewardStaking) {
      throw new Error(
        "ไม่พบ Reward Staking Contract"
      );
    }

    setLoading(
      true,
      `กำลังถอน Stake #${Number(lotIndex) + 1}...`
    );

    const transaction =
      await rewardStaking
        .withdraw(
          lotIndex
        );

    setLoading(
      true,
      "กำลังรอยืนยันบน Blockchain..."
    );

    await transaction.wait();

    showNotification(
      "สำเร็จ",
      "ถอน Stake สำเร็จ",
      "success"
    );

    await refreshStaking();
  } catch (error) {
    showNotification(
      "ถอนไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );
  } finally {
    setLoading(false);
  }
}


/* =========================================================
   WITHDRAW MATURED LOTS
========================================================= */

export async function withdrawMaturedLots() {
  try {
    if (
      !isWalletConnected()
    ) {
      await connectWallet();
    }

    const {
      rewardStaking
    } = getContracts();

    const userAddress =
      getUserAddress();

    if (
      !rewardStaking ||
      !userAddress
    ) {
      throw new Error(
        "กรุณาเชื่อม Wallet"
      );
    }

    const totalLots =
      await rewardStaking
        .stakeLotsCount(
          userAddress
        );

    if (
      totalLots === 0n
    ) {
      throw new Error(
        "ยังไม่มีรายการ Stake"
      );
    }

    const withdrawable =
      await rewardStaking
        .withdrawableAmount(
          userAddress
        );

    if (
      withdrawable === 0n
    ) {
      throw new Error(
        "ยังไม่มี Stake ที่ครบกำหนดถอน"
      );
    }

    setDisabled(
      "withdrawMaturedBtn",
      true
    );

    setLoading(
      true,
      "กำลังถอน Stake ที่ครบกำหนด..."
    );

    const transaction =
      await rewardStaking
        .withdrawMatured(
          0,
          totalLots
        );

    setLoading(
      true,
      "กำลังรอยืนยันบน Blockchain..."
    );

    await transaction.wait();

    showNotification(
      "สำเร็จ",
      "ถอน Stake ที่ครบกำหนดสำเร็จ",
      "success"
    );

    await refreshStaking();
  } catch (error) {
    showNotification(
      "ถอนไม่สำเร็จ",
      getErrorMessage(error),
      "error"
    );
  } finally {
    setLoading(false);

    setDisabled(
      "withdrawMaturedBtn",
      stakingState
        .withdrawableAmount ===
      0n
    );
  }
}


/* =========================================================
   EVENTS
========================================================= */

function bindStakingEvents() {
  const withdrawMaturedButton =
    getElement(
      "withdrawMaturedBtn"
    );

  withdrawMaturedButton
    ?.addEventListener(
      "click",
      withdrawMaturedLots
    );

  const previousButton =
    getElement(
      "stakePrevBtn"
    );

  previousButton
    ?.addEventListener(
      "click",
      () => {
        if (
          stakingState.page >
          1
        ) {
          stakingState.page--;

          renderStakeLots();
        }
      }
    );

  const nextButton =
    getElement(
      "stakeNextBtn"
    );

  nextButton
    ?.addEventListener(
      "click",
      () => {
        const pageSize =
          window.APP_CONFIG
            ?.STAKE_PAGE_SIZE ||
          5;

        const totalPages =
          Math.ceil(
            stakingState
              .lots
              .length /
            pageSize
          );

        if (
          stakingState.page <
          totalPages
        ) {
          stakingState.page++;

          renderStakeLots();
        }
      }
    );

  document.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          ".withdraw-lot-btn"
        );

      if (
        !button ||
        button.disabled
      ) {
        return;
      }

      const lotIndex =
        Number(
          button.dataset.index
        );

      button.disabled =
        true;

      try {
        await withdrawStakeLot(
          lotIndex
        );
      } finally {
        button.disabled =
          false;
      }
    }
  );

  document.addEventListener(
    "walletConnected",
    async () => {
      await refreshStaking();
    }
  );

  document.addEventListener(
    "walletDisconnected",
    () => {
      resetStakingUI();
    }
  );

  document.addEventListener(
    "rewardClaimed",
    async () => {
      await refreshStaking();
    }
  );
}


/* =========================================================
   INITIALIZE STAKING MODULE
========================================================= */

export function initStaking() {
  resetStakingUI();

  bindStakingEvents();

  return true;
}
