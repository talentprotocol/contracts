import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { countEntities } from "./store";
// Host exports for assertion.
declare namespace _assert {
  // Host exports for assertion with default message.
  function fieldEquals(entityType: string, id: string, fieldName: string, expectedVal: string): bool;
  function equals(expected: ethereum.Value, actual: ethereum.Value): bool;
  function notInStore(entityType: string, id: string): bool;
  function dataSourceCount(template: string, expectedCount: i32): bool;
  function dataSourceExists(template: string, address: string): bool;

  // Host exports for assertion with custom message.
  function fieldEqualsWithMessage(entityType: string, id: string, fieldName: string, expectedVal: string, message: string): bool;
  function equalsWithMessage(expected: ethereum.Value, actual: ethereum.Value, message: string): bool;
  function notInStoreWithMessage(entityType: string, id: string, message: string): bool;
  function dataSourceCountWithMessage(template: string, expectedCount: i32, message: string): bool;
  function dataSourceExistsWithMessage(template: string, address: string, message: string): bool;
}

export namespace assert {
  export function dataSourceCount(template: string, expectedCount: i32, message: string | null = null): void {
    let success: bool = message ? _assert.dataSourceCountWithMessage(template, expectedCount, message) : _assert.dataSourceCount(template, expectedCount);

    if (!success) {
      throw new Error("Assertion Error");
    }
  }

  export function dataSourceExists(template: string, address: string, message: string | null = null): void {
    let success: bool = message
      ? _assert.dataSourceExistsWithMessage(template, address, message)
      : _assert.dataSourceExists(template, address);

    if (!success) {
      throw new Error("Assertion Error");
    }
  }

  export function fieldEquals(entityType: string, id: string, fieldName: string, expectedVal: string, message: string | null = null): void {
    let success: bool = message
      ? _assert.fieldEqualsWithMessage(entityType, id, fieldName, expectedVal, message)
      : _assert.fieldEquals(entityType, id, fieldName, expectedVal);

    if (!success) {
      throw new Error("assert.fieldEquals Assertion Error");
    };
  }

  export function equals(expected: ethereum.Value, actual: ethereum.Value, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(expected, actual, message)
      : _assert.equals(expected, actual);

    if (!success) {
      throw new Error("assert.equals Assertion Error");
    };
  }

  export function notInStore(entityType: string, id: string, message: string | null = null): void {
    let success: bool = message
      ? _assert.notInStoreWithMessage(entityType, id, message)
      : _assert.notInStore(entityType, id);

    if (!success) {
      throw new Error("assert.notInStore Assertion Error");
    };
  }

  export function addressEquals(address1: Address, address2: Address, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromAddress(address1), ethereum.Value.fromAddress(address2), message)
      : _assert.equals(ethereum.Value.fromAddress(address1), ethereum.Value.fromAddress(address2));

    if (!success) {
      throw new Error("assert.addressEquals Assertion Error");
    };
  }

  export function bytesEquals(bytes1: Bytes, bytes2: Bytes, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromBytes(bytes1), ethereum.Value.fromBytes(bytes2), message)
      : _assert.equals(ethereum.Value.fromBytes(bytes1), ethereum.Value.fromBytes(bytes2));

    if (!success) {
      throw new Error("assert.bytesEquals Assertion Error");
    };
  }

  export function i32Equals(number1: i32, number2: i32, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromI32(number1), ethereum.Value.fromI32(number2), message)
      : _assert.equals(ethereum.Value.fromI32(number1), ethereum.Value.fromI32(number2));

    if (!success) {
      throw new Error("assert.i32Equals Assertion Error");
    };
  }

  export function bigIntEquals(bigInt1: BigInt, bigInt2: BigInt, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromSignedBigInt(bigInt1), ethereum.Value.fromSignedBigInt(bigInt2), message)
      : _assert.equals(ethereum.Value.fromSignedBigInt(bigInt1), ethereum.Value.fromSignedBigInt(bigInt2));

    if (!success) {
      throw new Error("assert.bigIntEquals Assertion Error");
    };
  }

  export function booleanEquals(bool1: boolean, bool2: boolean, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromBoolean(bool1), ethereum.Value.fromBoolean(bool2), message)
      : _assert.equals(ethereum.Value.fromBoolean(bool1), ethereum.Value.fromBoolean(bool2));

    if (!success) {
      throw new Error("assert.booleanEquals Assertion Error");
    };
  }

  export function stringEquals(string1: string, string2: string, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromString(string1), ethereum.Value.fromString(string2), message)
      : _assert.equals(ethereum.Value.fromString(string1), ethereum.Value.fromString(string2));

    if (!success) {
      throw new Error("assert.stringEquals Assertion Error");
    };
  }

  export function arrayEquals(array1: Array<ethereum.Value>, array2: Array<ethereum.Value>, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromArray(array1), ethereum.Value.fromArray(array2), message)
      : _assert.equals(ethereum.Value.fromArray(array1), ethereum.Value.fromArray(array2));

    if (!success) {
      throw new Error("assert.arrayEquals Assertion Error");
    };
  }

  export function tupleEquals(tuple1: ethereum.Tuple, tuple2: ethereum.Tuple, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromTuple(tuple1), ethereum.Value.fromTuple(tuple2), message)
      : _assert.equals(ethereum.Value.fromTuple(tuple1), ethereum.Value.fromTuple(tuple2));

    if (!success) {
      throw new Error("assert.tupleEquals Assertion Error");
    };
  }

  export function assertTrue(value: boolean, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value), message)
      : _assert.equals(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value));


    if (!success) {
      throw new Error("assert.assertTrue Assertion Error");
    };
  }

  export function assertNull<T>(value: T, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value == null), message)
      : _assert.equals(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value == null));

    if (!success) {
      throw new Error("assert.assertNull Assertion Error");
    };
  }

  export function assertNotNull<T>(value: T, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value != null), message)
      : _assert.equals(ethereum.Value.fromBoolean(true), ethereum.Value.fromBoolean(value != null));

    if (!success) {
      throw new Error("assert.assertNotNull Assertion Error");
    };
  }

  export function entityCount(entityType: string, expectedCount: i32, message: string | null = null): void {
    let success: bool = message
      ? _assert.equalsWithMessage(ethereum.Value.fromI32(expectedCount), ethereum.Value.fromI32(countEntities(entityType)), message)
      : _assert.equals(ethereum.Value.fromI32(expectedCount), ethereum.Value.fromI32(countEntities(entityType)));

    if (!success) {
      throw new Error("assert.entityCount Assertion Error");
    };
  }
}
