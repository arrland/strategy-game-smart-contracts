pragma solidity ^0.8.25;

interface IPirateNFT {
    // Errors
    error InvalidNewItemRoyalty();

    // Events
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event Initialized(uint8 version);
    event ItemConsumed(uint256 itemId, uint256 amount);
    event ItemRoyaltyChanged(uint256 itemId, uint256 newRoyalty);
    event ItemsAdded(uint256 from, uint256 count);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event URI(string value, uint256 indexed id);

    // Functions
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function FEE_MAX_PERCENT() external view returns (uint256);
    function MAX_ITEM_COUNT() external view returns (uint256);
    function MINTER_ROLE() external view returns (bytes32);
    function PERCENTS_DIVIDER() external view returns (uint256);
    function addItems(uint256[] calldata newItems) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function consumeItem(address from, uint256 itemId, uint256 amount) external;
    function factory() external view returns (address);
    function getItem(uint256 itemId) external view returns (uint256 supply, uint256 maxSupply, uint256 royaltyFee, uint256 isConsumable, address creator);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function initialize(string calldata _name, string calldata _uri, address _creator, address _factory, bool _isPublic) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function isPublic() external view returns (bool);
    function mint(address recipient, uint256 itemId, uint256 amount, bytes calldata data) external returns (bool);
    function name() external view returns (string memory);
    function nextItemId() external view returns (uint256);
    function owner() external view returns (address);
    function renounceRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function royaltyInfo(uint256 itemId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount);
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function setItemRoyalty(uint256 itemId, uint256 royaltyFee) external;
    function setName(string calldata newName) external;
    function setURI(string calldata newUri) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    function uri(uint256 itemId) external view returns (string memory);

    // Receive function
    receive() external payable;
}
