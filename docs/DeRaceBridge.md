# DeRaceBridge

*Tadas Varanauskas &lt;tadas@bitlocus.com&gt;*

> DeRace Bridge contract

Allows bi-directional movement of tokens (ERC20 and ERC721) between an EVM based chain and DeRace off-chain enviroment

*The bridge holds all the assets that are transfered off-chain. When assets are transfered back on chain they are redeemed from the bridge with a specific validator signed message*

## Methods

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### METHOD_ERC20

```solidity
function METHOD_ERC20() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### METHOD_ERC721

```solidity
function METHOD_ERC721() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### METHOD_ERC721ANY

```solidity
function METHOD_ERC721ANY() external view returns (bytes32)
```

This allows to transfer an amount of ERC721 without needing to specify their different IDs, making the ERC721 tokens fungible (requires `ERC721Enumerable`)




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### SUPER_VALIDATOR_ROLE

```solidity
function SUPER_VALIDATOR_ROLE() external view returns (bytes32)
```

Role that allows changing global settings of the bridge (`version`, `skipNonce` for specific address)

*This role is only granted for multisigs (for example Gnosis Multisig) and is a global administrative role*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### TRANSFER_TYPEHASH

```solidity
function TRANSFER_TYPEHASH() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### VALIDATOR_ROLE

```solidity
function VALIDATOR_ROLE() external view returns (bytes32)
```

Role that allows signing off-chain transactions, all off-chain transactions in `completeErcXTransfer` need to be signed by an address holding this role




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### completeErc20Transfer

```solidity
function completeErc20Transfer(address token, uint256 amount, bytes signature) external nonpayable
```

Redeem ERC20 tokens sent from off-chain to on-chain



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token contract address |
| amount | uint256 | Number of ERC20 tokens being received |
| signature | bytes | The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer |

### completeErc721AnyTransfer

```solidity
function completeErc721AnyTransfer(contract IERC721Enumerable token, uint256 amount, bytes signature) external nonpayable
```

Redeem ERC721 tokens sent from off-chain to on-chain as if they vere fungible



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721Enumerable | Token contract address |
| amount | uint256 | Number of ERC721 tokens being received |
| signature | bytes | The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer |

### completeErc721Transfer

```solidity
function completeErc721Transfer(contract IERC721 token, uint256 tokenId, bytes signature) external nonpayable
```

Redeem ERC721 tokens sent from off-chain to on-chain



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721 | Token contract address |
| tokenId | uint256 | The token ID of the token being received |
| signature | bytes | The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer |

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```



*Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role&#39;s admin, use {_setRoleAdmin}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```



*Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```



*Returns `true` if `account` has been granted `role`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### migrateErc20

```solidity
function migrateErc20(contract IERC20 token, address destination, uint256 amount) external nonpayable
```

Migrate ERC20 tokens to a new bridge



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC20 | Token contract address |
| destination | address | Recipient of the tokens |
| amount | uint256 | Number of ERC20 tokens being migrated |

### migrateErc721

```solidity
function migrateErc721(contract IERC721 token, address destination, uint256 tokenId) external nonpayable
```

Migrate ERC721 token to a new bridge



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721 | Token contract address |
| destination | address | Recipient of the token |
| tokenId | uint256 | Token ID of the token being migrated |

### migrateErc721Any

```solidity
function migrateErc721Any(contract IERC721Enumerable token, address destination, uint256 amount) external nonpayable
```

Migrate ERC721 tokens to a new bridge as if they were fungible



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721Enumerable | Token contract address |
| destination | address | Recipient of the tokens |
| amount | uint256 | Number of ERC721 tokens being migrated |

### nonces

```solidity
function nonces(address) external view returns (uint256)
```

Each address has a nonce that represents the sequence number of the generated signatures for that addresses, only transfers with sequential nonces are accepted from off-chain

*This is needed to prevent double spends by completing the same of chain transfer twice*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### onERC721Received

```solidity
function onERC721Received(address, address, uint256, bytes) external nonpayable returns (bytes4)
```



*See {IERC721Receiver-onERC721Received}. Always returns `IERC721Receiver.onERC721Received.selector`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |
| _2 | uint256 | undefined |
| _3 | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined |

### pause

```solidity
function pause() external nonpayable
```

Pauses all transfers on the bridge




### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function&#39;s purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### setVersion

```solidity
function setVersion(uint256 _version) external nonpayable
```

Set global version of all signatures, useful when all signatures of a previous version need to be invalidated, for example when a VALIDATOR is compromised



#### Parameters

| Name | Type | Description |
|---|---|---|
| _version | uint256 | The new version that will be used with all new signatures |

### skipNonce

```solidity
function skipNonce(address sender) external nonpayable
```

Increments nonce of a given address by doing an &quot;empty&quot; transfer



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | The address for which to increment nonce |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*See {IERC165-supportsInterface}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferErc20

```solidity
function transferErc20(contract IERC20 token, uint256 amount) external nonpayable
```

Send ERC20 tokens off-chain



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC20 | Token contract address |
| amount | uint256 | Number of ERC20 tokens sent |

### transferErc721

```solidity
function transferErc721(contract IERC721 token, uint256 tokenId) external nonpayable
```

Send ERC721 token off-chain



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721 | Token contract address |
| tokenId | uint256 | The token ID of the token being sent off-chain |

### transferErc721Any

```solidity
function transferErc721Any(contract IERC721Enumerable token, uint256 amount) external nonpayable
```

Send ERC721 as if they were fungible when only the amount is important



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC721Enumerable | Token contract address |
| amount | uint256 | Number of ERC20 tokens sent |

### unpause

```solidity
function unpause() external nonpayable
```

Resumes bridge functionality




### version

```solidity
function version() external view returns (uint256)
```

Global version of accepted signatures, useful if need to invalidate all previously signed messages, by increasing the version in `setVersion` all messages with the previous version become invalid




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### CompleteErc20Transfer

```solidity
event CompleteErc20Transfer(address indexed sender, address indexed token, uint256 amount)
```

Redemption of an off-chain transfer to chain of ERC20 tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The recipient of the tokens (the sender of the transaction) |
| token `indexed` | address | Token contract address |
| amount  | uint256 | Number of ERC20 tokens being received |

### CompleteErc721Transfer

```solidity
event CompleteErc721Transfer(address indexed sender, address indexed token, uint256 tokenId)
```

Redemption of an off-chain transfer to chain of ERC721 tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The recipient of the tokens (the sender of the transaction) |
| token `indexed` | address | Token contract address |
| tokenId  | uint256 | The token ID of the token being received |

### Header

```solidity
event Header(address indexed sender, uint256 indexed version, uint256 nonce)
```

Tracking for signature data of off-chain transfers



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The recipient of the off-chain transfer |
| version `indexed` | uint256 | Global version (described in `version`) for all valid signatures |
| nonce  | uint256 | Sequence number of the off-chain transactions for this `sender` |

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| previousAdminRole `indexed` | bytes32 | undefined |
| newAdminRole `indexed` | bytes32 | undefined |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### TransferErc20

```solidity
event TransferErc20(address indexed sender, address indexed token, uint256 amount)
```

A transfer of ERC20 tokens from chain to off-chain

*Events are monitored off chain and their intent executed*

#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The sender of the tokens |
| token `indexed` | address | Token contract address |
| amount  | uint256 | Number of ERC20 tokens sent |

### TransferErc721

```solidity
event TransferErc721(address indexed sender, address indexed token, uint256 tokenId)
```

A transfer of ERC721 token from chain to off-chain

*Events are monitored off chain and their intent executed*

#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The sender of the tokens |
| token `indexed` | address | Token contract address |
| tokenId  | uint256 | The token ID of transfered token |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |



## Errors

### NotValid

```solidity
error NotValid(address signer)
```

The signature being validated was not signed by one of the validators with `VALIDATOR_ROLE`



#### Parameters

| Name | Type | Description |
|---|---|---|
| signer | address | The address that was decoded from message signature |


