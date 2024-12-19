import { Bytes, BigInt, ethereum, Address } from "@graphprotocol/graph-ts";
import { ONE_BI, ZERO_BI } from "../../utils/Decimals";

class MockTransactionArgs {
  hash: Bytes;
  index: BigInt;
  from: Address;
  to: Address;
  value: BigInt;
  gasLimit: BigInt;
  gasPrice: BigInt;
  input: Bytes;
  nonce: BigInt;
}

export function mockTransaction(
  args: MockTransactionArgs = {
    hash: Bytes.fromHexString("0xe1ed79d866dc2cfdf088c580dd7226e7a4610e020ab6a8e254220118f4ad9719"),
    index: ONE_BI,
    from: Address.fromString("0xD226F6eDcc6a3B8D3e4205554Fa5EAc98f607b93"),
    to: Address.fromString("0xD1A0D188E861ed9d15773a2F3574a2e94134bA8f"),
    value: ZERO_BI,
    gasLimit: ZERO_BI,
    gasPrice: ZERO_BI,
    input: Bytes.fromHexString("0x553030d0"),
    nonce: BigInt.fromString("12345")
  }
): ethereum.Transaction {
  return new ethereum.Transaction(
    args.hash,
    args.index,
    args.from,
    args.to,
    args.value,
    args.gasLimit,
    args.gasPrice,
    args.input,
    args.nonce
  );
}
