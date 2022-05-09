// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title DeRace Bridge contract
/// @author Tadas Varanauskas <tadas@bitlocus.com>
/// @notice Allows bi-directional movement of tokens (ERC20 and ERC721) between an EVM based chain and DeRace off-chain enviroment
/// @dev The bridge holds all the assets that are transfered off-chain. When assets are transfered back on chain they are redeemed from the bridge with a specific validator signed message
contract DeRaceBridge is EIP712, Pausable, AccessControl, ERC721Holder {
    using SafeERC20 for IERC20;

    /// @notice The signature being validated was not signed by one of the validators with `VALIDATOR_ROLE`
    /// @param signer The address that was decoded from message signature
    error NotValid(address signer);

    // Below are constants necessary for constructing an EIP-712 message to be signed by one of the `VALIDATOR_ROLE` holders
    bytes32 public constant METHOD_ERC20 = keccak256("ERC20");
    bytes32 public constant METHOD_ERC721 = keccak256("ERC721");
    /// @notice This allows to transfer an amount of ERC721 without needing to specify their different IDs, making the ERC721 tokens fungible (requires `ERC721Enumerable`)
    bytes32 public constant METHOD_ERC721ANY = keccak256("ERC721ANY");
    bytes32 public constant TRANSFER_TYPEHASH = keccak256("Transfer(address sender,uint256 version,uint256 nonce,bytes32 method,address token,uint256 data)");

    /// @notice Tracking for signature data of off-chain transfers
    /// @param sender The recipient of the off-chain transfer
    /// @param version Global version (described in `version`) for all valid signatures
    /// @param nonce Sequence number of the off-chain transactions for this `sender`
    event Header(address indexed sender, uint256 indexed version, uint256 nonce);

    // Below are events emited when transfering the tokens from chain to off-chain

    /// @notice A transfer of ERC20 tokens from chain to off-chain
    /// @dev Events are monitored off chain and their intent executed
    /// @param sender The sender of the tokens
    /// @param token Token contract address
    /// @param amount Number of ERC20 tokens sent
    event TransferErc20(address indexed sender, address indexed token, uint256 amount);
    /// @notice A transfer of ERC721 token from chain to off-chain
    /// @dev Events are monitored off chain and their intent executed
    /// @param sender The sender of the tokens
    /// @param token Token contract address
    /// @param tokenId The token ID of transfered token
    event TransferErc721(address indexed sender, address indexed token, uint256 tokenId);

    /// @notice Redemption of an off-chain transfer to chain of ERC20 tokens
    /// @param sender The recipient of the tokens (the sender of the transaction)
    /// @param token Token contract address
    /// @param amount Number of ERC20 tokens being received
    event CompleteErc20Transfer(address indexed sender, address indexed token, uint256 amount);
    /// @notice Redemption of an off-chain transfer to chain of ERC721 tokens
    /// @param sender The recipient of the tokens (the sender of the transaction)
    /// @param token Token contract address
    /// @param tokenId The token ID of the token being received
    event CompleteErc721Transfer(address indexed sender, address indexed token, uint256 tokenId);

    /// @notice Role that allows changing global settings of the bridge (`version`, `skipNonce` for specific address, )
    bytes32 public constant SUPER_VALIDATOR_ROLE = keccak256("SUPER_VALIDATOR_ROLE");
    /// @notice Role that allows signing off-chain transactions, all off-chain transactions in `completeErcXTransfer` need to be signed by an address holding this role
    bytes32 public constant VALIDATOR_ROLE = keccak256("APPROVER_ROLE");
    
    /// @notice Global version of accepted signatures, useful if need to invalidate all previously signed messages, by increasing the version in `setVersion` all messages with the previous version become invalid
    uint256 public version = 0;
    /// @notice Each address has a nonce that represents the sequence number of the generated signatures for that addresses, only transfers with sequential nonces are accepted from off-chain
    /// @dev This is needed to prevent double spends by completing the same of chain transfer twice
    mapping(address => uint256) public nonces;

    /// @dev Validate incoming off-chain transfer for `version`, `nonce` and that it is signed by `VALIDATOR_ROLE` holders, after the transaction emit header and increment nonce
    modifier externalTransfer(bytes32 method, address token, uint256 data, bytes calldata signature) {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            TRANSFER_TYPEHASH,
            msg.sender,
            version,
            nonces[msg.sender],
            method,
            token,
            data
        )));
        address signer = ECDSA.recover(digest, signature);
        if (!hasRole(VALIDATOR_ROLE, signer)) revert NotValid(signer);
        _;
        _emitHeader(msg.sender);
    }

    /// @notice Initialize a new bridge with a `_name` and EIP712 `_version` shown when signing the EIP712 message
    /// @dev `_name` and  `_version` are needed for the EIP712 domain
    /// @param _name EIP712 domain name
    /// @param _version EIP712 domain version
    constructor(string memory _name, string memory _version) EIP712(_name, _version) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Used when an off-chain transfer is validated and executed
    /// @param sender The address of the off-chain transfer
    function _emitHeader(address sender) private {
        emit Header(sender, version, nonces[sender]++);
    }

    /// @notice Send ERC20 tokens off-chain
    /// @param token Token contract address
    /// @param amount Number of ERC20 tokens sent
    function transferErc20(address token, uint256 amount) public whenNotPaused {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TransferErc20(msg.sender, token, amount);
    }

    /// @notice Send ERC20 tokens off-chain
    function _transferErc721(IERC721 token, uint256 tokenId) private {
        token.safeTransferFrom(msg.sender, address(this), tokenId);
        emit TransferErc721(msg.sender, address(token), tokenId);
    }

    /// @notice Send ERC721 token off-chain
    /// @param token Token contract address
    /// @param tokenId The token ID of the token being sent off-chain
    function transferErc721(IERC721 token, uint256 tokenId) public whenNotPaused {
        _transferErc721(token, tokenId);
    }

    /// @notice Send ERC721 as if they were fungible when only the amount is important
    /// @param token Token contract address
    /// @param amount Number of ERC20 tokens sent
    function transferErc721Any(IERC721Enumerable token, uint256 amount) public whenNotPaused {
        for (uint256 index = 0; index < amount; index++) {
            uint256 tokenId = token.tokenOfOwnerByIndex(msg.sender, 0);
            _transferErc721(token, tokenId);
        }
    }

    /// @notice Redeem ERC20 tokens sent from off-chain to on-chain
    /// @param token Token contract address
    /// @param amount Number of ERC20 tokens being received
    /// @param signature The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer
    function completeErc20Transfer(address token, uint256 amount, bytes calldata signature)
        public
        externalTransfer(METHOD_ERC20, token, amount, signature)
        whenNotPaused
    {
        emit CompleteErc20Transfer(msg.sender, token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Redeem ERC20 tokens from off-chain
    function _completeErc721Transfer(IERC721 token, uint256 tokenId) private {
        emit CompleteErc721Transfer(msg.sender, address(token), tokenId);
        IERC721(token).safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Redeem ERC721 tokens sent from off-chain to on-chain
    /// @param token Token contract address
    /// @param tokenId The token ID of the token being received
    /// @param signature The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer
    function completeErc721Transfer(IERC721 token, uint256 tokenId, bytes calldata signature)
        public
        externalTransfer(METHOD_ERC721, address(token), tokenId, signature)
        whenNotPaused
    {
        _completeErc721Transfer(token, tokenId);
    }

    /// @notice Redeem ERC721 tokens sent from off-chain to on-chain as if they vere fungible
    /// @param token Token contract address
    /// @param amount Number of ERC721 tokens being received
    /// @param signature The signature signed by `VALIDATOR_ROLE` that verifies the off-chain transfer
    function completeErc721AnyTransfer(IERC721Enumerable token, uint256 amount, bytes calldata signature)
        public
        externalTransfer(METHOD_ERC721ANY, address(token), amount, signature)
        whenNotPaused
    {
        for (uint256 index = 0; index < amount; index++) {
            uint256 tokenId = token.tokenOfOwnerByIndex(address(this), 0);
            _completeErc721Transfer(token, tokenId);
        }
    }

    /// @notice Pauses all transfers on the bridge
    function pause() public onlyRole(SUPER_VALIDATOR_ROLE) {
        _pause();
    }

    /// @notice Resumes bridge functionality
    function unpause() public onlyRole(SUPER_VALIDATOR_ROLE) {
        _unpause();
    }

    /// @notice Increments nonce of a given address by doing an "empty" transfer
    /// @param sender The address for which to increment nonce
    function skipNonce(address sender) public onlyRole(SUPER_VALIDATOR_ROLE) {
        _emitHeader(sender);
    }

    /// @notice Set global version of all signatures, useful when all signatures of a previous version need to be invalidated, for example when a VALIDATOR is compromised
    /// @param _version The new version that will be used with all new signatures
    function setVersion(uint256 _version) public onlyRole(SUPER_VALIDATOR_ROLE) {
        version = _version;
    }

    /// @notice Migrate ERC20 tokens to a new bridge
    /// @param token Token contract address
    /// @param destination Recipient of the tokens
    /// @param amount Number of ERC20 tokens being migrated
    function migrateErc20(IERC20 token, address destination, uint256 amount)
        public
        onlyRole(SUPER_VALIDATOR_ROLE)
    {
        token.safeTransfer(destination, amount);
    }

    /// @notice Migrate ERC721 token to a new bridge
    /// @param token Token contract address
    /// @param destination Recipient of the token
    /// @param tokenId Token ID of the token being migrated
    function migrateErc721(IERC721 token, address destination, uint256 tokenId)
        public
        onlyRole(SUPER_VALIDATOR_ROLE)
    {
        token.safeTransferFrom(address(this), destination, tokenId);
    }

    /// @notice Migrate ERC721 tokens to a new bridge as if they were fungible
    /// @param token Token contract address
    /// @param destination Recipient of the tokens
    /// @param amount Number of ERC721 tokens being migrated
    function migrateErc721Any(IERC721Enumerable token, address destination, uint256 amount)
        public
        onlyRole(SUPER_VALIDATOR_ROLE)
    {
        for (uint256 index = 0; index < amount; index++) {
            uint256 tokenId = token.tokenOfOwnerByIndex(address(this), 0);
            token.safeTransferFrom(address(this), destination, tokenId);
        }
    }
}
