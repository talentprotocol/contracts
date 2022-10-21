pragma solidity ^0.8.7;

enum TIERS {
    USER,
    PARTNER,
    TOKEN_HOLDER,
    TALENT_HOUSE,
    CONTRIBUTOR,
    INVESTOR,
    ACTIVE_CONTRIBUTOR,
    CORE_TEAM
}

function decodeFromTierEnum(TIERS tier) pure returns (bytes32) {
    if (tier == TIERS.PARTNER) {
        return "PARTNER";
    }
    if (tier == TIERS.TOKEN_HOLDER) {
        return "TOKEN_HOLDER";
    }
    if (tier == TIERS.TALENT_HOUSE) {
        return "TALENT_HOUSE";
    }
    if (tier == TIERS.CONTRIBUTOR) {
        return "CONTRIBUTOR";
    }
    if (tier == TIERS.INVESTOR) {
        return "INVESTOR";
    }
    if (tier == TIERS.ACTIVE_CONTRIBUTOR) {
        return "ACTIVE_CONTRIBUTOR";
    }
    if (tier == TIERS.CORE_TEAM) {
        return "CORE_TEAM";
    }
    return "USER";
}