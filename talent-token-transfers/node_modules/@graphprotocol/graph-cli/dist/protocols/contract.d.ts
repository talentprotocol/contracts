export interface ContractCtor {
    new (account: string): Contract;
    identifierName(): string;
}
export interface Contract {
    validate(): {
        valid: boolean;
        error: string | null;
    };
}
