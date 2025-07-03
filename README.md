# 🟣 PROJECT: **Monadeal – P2P NFT Dealroom**

> A decentralized, messaging-first platform that lets users **negotiate and finalize NFT trades, swaps, or sales** securely through escrow smart contracts.

We'll break it into **two main prompt sections**:

---

## 🧠 SECTION 1: Core Backend Prompts (Node.js + Solidity)

These prompts will scaffold the backend APIs, smart contract logic, and storage layers.

---

### 🟪 **1. Create Escrow Smart Contract (Solidity / EVM compatible with Monad)**

```
Write a Solidity smart contract for an NFT escrow that supports the following features:

1. A seller lists an NFT with a sale price.
2. A buyer can accept the deal by sending the exact amount of ETH/MON.
3. The NFT and payment are swapped atomically.
4. If either party cancels before finalization, the escrow is voided and assets are returned.
5. Support ERC-721 NFTs.
6. Emit events for: DealCreated, DealCancelled, DealCompleted.
7. Add `getDealStatus(dealId)` function.

Optimize for gas efficiency and security. Assume the contract will be deployed on Monad.
```

---

### 🟪 **2. Node.js Backend API to Handle Deal Rooms (Express or Next.js API)**

```
Build a backend in Node.js (Express or Next.js API routes) with the following endpoints:

1. POST /api/deal - Create a deal proposal (buy/sell/swap)
   - Payload: { dealType: 'buy' | 'sell' | 'swap', fromAddress, toAddress, nftContract, tokenId, priceInMON }
   - Store in-memory or use a mock DB like JSON or SQLite for now.

2. GET /api/deal/:id - Fetch a specific deal.

3. POST /api/message - Send a message in a deal chat session
   - Payload: { dealId, fromAddress, message }
   - Store messages under the deal ID.

4. GET /api/messages/:dealId - Return all messages for a deal room.

The backend should also validate wallet addresses and sanitize inputs.
```

---

### 🟪 **3. Metadata Fetcher Utility**

```
Write a Node.js utility that fetches metadata for a given ERC-721 NFT.

Inputs: contract address and token ID.
Returns: { name, image URL, attributes, collectionName }

Use the Alchemy NFT API or fallback to public IPFS metadata.
```

---

## 🎨 SECTION 2: Frontend UI/UX Prompts (Next.js + Tailwind + Wagmi)

These prompts will build your front-end layout, pages, and chat/escrow interaction UI.

---

### 🟦 **4. Homepage UI Prompt (Landing Page + Deal Creation)**

```
Using Next.js, Tailwind CSS, and Shadcn/ui components, create a responsive homepage for Monadeal.

Sections:
1. Hero header with logo, description (“P2P NFT deals. Chat, negotiate, trade securely.”) and CTA.
2. Section for creating a new deal:
   - Deal type: [Sell] [Buy] [Swap] (radio buttons)
   - NFT picker (show connected wallet NFTs via wagmi)
   - Price input (if Sell or Buy)
   - “Start Deal” button that triggers API call.

Include dark mode support, Mona-purple theme, and mobile responsiveness.
```

---

### 🟦 **5. Deal Chatroom UI Prompt**

```
Build a deal-specific chatroom page using Next.js and Tailwind. Route: /deal/[dealId]

Features:
1. Sidebar with deal summary:
   - NFT image, name, price, sender and receiver wallets.
   - Deal status (Pending, Locked, Completed, Cancelled).
   - “Accept Deal” and “Cancel Deal” buttons.

2. Chat panel:
   - Message bubbles aligned based on sender.
   - Input field + send button.
   - Optional: emoji picker, file upload placeholder.

3. On Accept, call smart contract escrow function via wagmi hooks.
4. On complete, show success animation + link to explorer.

Use monanimal-styled avatars or room themes for visual lore.
```

---

### 🟦 **6. NFT Picker Component**

```
Build a component that:
- Connects the user's wallet via Wagmi.
- Fetches owned ERC-721 NFTs using Alchemy API.
- Shows NFTs in a grid with select functionality.
- Allows the user to select one NFT for a deal.

Use a Card UI (image, name, token ID).
```

---

### 🟦 **7. Deal History & Inbox Page**

```
Create a “My Deals” page showing past deal sessions.

For each deal:
- Show counterparty wallet
- NFT image + name
- Deal status
- Link to resume chat

Include tabs:
- Active Deals
- Completed
- Cancelled

Use table or card layout with filters (by collection, status, date).
```

---

### 🟦 **8. Deal Status Component (Reusable UI)**

```
Create a component that shows deal status visually.

Statuses:
- Pending
- Awaiting Buyer
- Awaiting Seller
- Locked (in Escrow)
- Completed
- Cancelled

Each status should have a colored badge + icon.
```

---

## 🧪 SECTION 3: Testing & Dummy Data Prompt

### 🧷 **9. Seed Mock Deals & Messages**

```
Write a script in JavaScript to populate mock deals and chat messages for testing purposes.

Each deal should contain:
- Type (buy/sell/swap)
- Wallet addresses
- NFT contract + token ID
- Messages between the two parties
- Random status

Useful for UI testing before smart contract integration.
```
