// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IInvoiceRegistry
/// @notice On-chain registry of tokenized trade receivables (invoices). Holds no funds.
interface IInvoiceRegistry {
    enum Status {
        None,
        Registered,
        Verified,
        Financed,
        Repaid,
        Defaulted,
        Cancelled
    }

    struct Invoice {
        address supplier; // SME that owns the receivable (gets the advance)
        address debtor; // buyer that owes the invoice (may be address(0) if off-chain)
        address asset; // settlement token expected (e.g. USDC)
        uint256 amount; // face value
        uint64 dueDate; // unix seconds
        uint64 createdAt; // unix seconds
        Status status;
        bytes32 docHash; // hash of the off-chain invoice document
        bytes32 externalRef; // unique real-world ref (anti double-financing)
    }

    function getInvoice(uint256 id) external view returns (Invoice memory);

    function isFinanceable(uint256 id) external view returns (bool);

    function markFinanced(uint256 id) external;

    function markRepaid(uint256 id) external;

    function markDefaulted(uint256 id) external;
}
