"use strict";

/* =========================================================
   NC REWARD OWNER — ABI.JS
========================================================= */

const REWARD_CORE_ABI = [

  /* =========================
     READ FUNCTIONS
  ========================= */

  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "rewardBps",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "maxUpline",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "claimStep",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "requiredOrganizationVolume",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "goldRank",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "syncPaused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "claimPaused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "syncers",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    name: "processedPurchases",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address"
      }
    ],
    name: "getUserRewardInfo",
    outputs: [
      {
        internalType: "uint256",
        name: "personalVolume",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "orgVolume",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "totalRewardEarned",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "totalRewardStaked",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "pending",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "claimable",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "remainingAfterClaim",
        type: "uint256"
      },
      {
        internalType: "uint8",
        name: "currentRank",
        type: "uint8"
      },
      {
        internalType: "bool",
        name: "goldQualified",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "orgQualified",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "claimQualified",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "bytes32",
        name: "transactionHash",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "logIndex",
        type: "uint256"
      }
    ],
    name: "makePurchaseId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },

  /* =========================
     RECORD PURCHASE
  ========================= */

  {
    inputs: [
      {
        internalType: "bytes32",
        name: "purchaseId",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "purchaseAmount",
        type: "uint256"
      }
    ],
    name: "recordPurchase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  /* =========================
     OWNER SETTINGS
  ========================= */

  {
    inputs: [
      {
        internalType: "uint256",
        name: "newRewardBps",
        type: "uint256"
      }
    ],
    name: "setRewardBps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMaxUpline",
        type: "uint256"
      }
    ],
    name: "setMaxUpline",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "newClaimStep",
        type: "uint256"
      }
    ],
    name: "setClaimStep",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "newVolume",
        type: "uint256"
      }
    ],
    name: "setRequiredOrganizationVolume",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "uint8",
        name: "newGoldRank",
        type: "uint8"
      }
    ],
    name: "setGoldRank",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "bool",
        name: "paused",
        type: "bool"
      }
    ],
    name: "setSyncPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "bool",
        name: "paused",
        type: "bool"
      }
    ],
    name: "setClaimPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      {
        internalType: "address",
        name: "syncer",
        type: "address"
      },
      {
        internalType: "bool",
        name: "allowed",
        type: "bool"
      }
    ],
    name: "setSyncer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  /* =========================
     EVENTS
  ========================= */

  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "purchaseId",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "purchaseAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "rewardBps",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "rewardAmount",
        type: "uint256"
      }
    ],
    name: "PurchaseRecorded",
    type: "event"
  },

  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "member",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "sourceBuyer",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "level",
        type: "uint256"
      }
    ],
    name: "OrganizationVolumeAdded",
    type: "event"
  }
];


/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.REWARD_CORE_ABI = REWARD_CORE_ABI;
