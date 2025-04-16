// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IMissionTypeStorage.sol";

interface ITradeStorage is IMissionTypeStorage {
    enum JourneyState { None, Outbound, Delivery, Inbound }
    
    function updateJourneyState(
        uint256 shipId,
        JourneyState newState,
        uint256 returnTime
    ) external;
    
    function getJourneyState(uint256 shipId) external view returns (JourneyState);
    
    function getTradeDetails(uint256 shipId) external view returns (
        uint256 tradeOrderId,
        uint256 price,
        bool isShipBuying
    );
    
    function getResourceInfo(uint256 shipId) external view returns (
        string memory resourceType,
        uint256 amount
    );
    
    function getIslandInfo(uint256 shipId) external view returns (
        uint256 originIslandId,
        uint256 targetIslandId
    );
    
    function getTimingInfo(uint256 shipId) external view returns (
        uint256 outboundEndTime,
        uint256 inboundEndTime
    );
} 