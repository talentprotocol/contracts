import { Entity } from "@graphprotocol/graph-ts";

// Host export for clearing the store.
export declare function clearStore(): void;

// Host export for pretty logging the store.
export declare function logStore(): void;

export declare function logEntity(entity: string, id: string, showRelated: bool = false): void;

export declare function countEntities(entityType: string): i32;

export declare function clearInBlockStore(): void;

export declare function mockInBlockStore(entity: string, id: string, data: Entity): void;

export declare function logDataSources(template: string): void;
