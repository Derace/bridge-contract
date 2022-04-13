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

contract DeRaceBridge is EIP712, Pausable, AccessControl, ERC721Holder {
    using SafeERC20 for IERC20;

    error NotValid(address signer);

    bytes32 public constant METHOD_ERC20 = keccak256("ERC20");
    bytes32 public constant METHOD_ERC721 = keccak256("ERC721");
    bytes32 public constant METHOD_ERC721ANY = keccak256("ERC721ANY");
    bytes32 public constant TRANSFER_TYPEHASH = keccak256("Transfer(address sender,uint256 version,uint256 nonce,bytes32 method,address token,uint256 data)");

    event Header(address indexed sender, uint256 indexed version, uint256 nonce);
    event TransferErc20(address indexed sender, address indexed token, uint256 amount);
    event TransferErc721(address indexed sender, address indexed token, uint256 tokenId);
    event CompleteErc20Transfer(address indexed sender, address indexed token, uint256 amount);
    event CompleteErc721Transfer(address indexed sender, address indexed token, uint256 tokenId);

    bytes32 public constant SUPER_VALIDATOR_ROLE = keccak256("SUPER_VALIDATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("APPROVER_ROLE");
    
    uint256 public version = 0;
    mapping(address => uint256) public nonces;

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

    constructor(string memory _name, string memory _version) EIP712(_name, _version) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _emitHeader(address sender) private {
        emit Header(sender, version, nonces[sender]++);
    }

    function transferErc20(address token, uint256 amount) public whenNotPaused {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TransferErc20(msg.sender, token, amount);
    }

    function _transferErc721(IERC721 token, uint256 tokenId) private {
        token.safeTransferFrom(msg.sender, address(this), tokenId);
        emit TransferErc721(msg.sender, address(token), tokenId);
    }

    function transferErc721(IERC721 token, uint256 tokenId) public whenNotPaused {
        _transferErc721(token, tokenId);
    }

    function transferErc721Any(IERC721Enumerable token, uint256 amount) public whenNotPaused {
        for (uint256 index = 0; index < amount; index++) {
            uint256 tokenId = token.tokenOfOwnerByIndex(msg.sender, 0);
            _transferErc721(token, tokenId);
        }
    }

    function completeErc20Transfer(address token, uint256 amount, bytes calldata signature)
        public
        externalTransfer(METHOD_ERC20, token, amount, signature)
        whenNotPaused
    {
        emit CompleteErc20Transfer(msg.sender, token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function _completeErc721Transfer(IERC721 token, uint256 tokenId) private {
        emit CompleteErc721Transfer(msg.sender, address(token), tokenId);
        IERC721(token).safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function completeErc721Transfer(IERC721 token, uint256 tokenId, bytes calldata signature)
        public
        externalTransfer(METHOD_ERC721, address(token), tokenId, signature)
        whenNotPaused
    {
        _completeErc721Transfer(token, tokenId);
    }

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

    function pause() public onlyRole(SUPER_VALIDATOR_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(SUPER_VALIDATOR_ROLE) {
        _unpause();
    }

    function skipNonce(address sender) public onlyRole(SUPER_VALIDATOR_ROLE) {
        _emitHeader(sender);
    }

    function setVersion(uint256 _version) public onlyRole(SUPER_VALIDATOR_ROLE) {
        version = _version;
    }

    function migrateErc20(IERC20 token, address destination, uint256 amount)
        public
        onlyRole(SUPER_VALIDATOR_ROLE)
    {
        token.safeTransfer(destination, amount);
    }

    function migrateErc721(IERC721 token, address destination, uint256 tokenId)
        public
        onlyRole(SUPER_VALIDATOR_ROLE)
    {
        token.safeTransferFrom(address(this), destination, tokenId);
    }

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
