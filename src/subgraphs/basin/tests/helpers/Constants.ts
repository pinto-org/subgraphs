import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { toDecimal } from "../../../../core/utils/Decimals";

export const WELL = Address.fromString("0xBEA0e11282e2bB5893bEcE110cF199501e872bAd");
export const AQUIFER = Address.fromString("0xF6a8aD553b265405526030c2102fda2bDcdDC177");
export const IMPLEMENTATION = Address.fromString("0x09120eAED8e4cD86D85a616680151DAA653880F2");
export const WELL_FUNCTION = Address.fromString("0xBA510C20FD2c52E4cb0d23CFC3cCD092F9165a6E");
export const PUMP = Address.fromString("0x6732128F9cc0c4344b2d4DC6285BCd516b7E59E6");
export const WELL_DATA = Bytes.empty();

export const BEAN_SWAP_AMOUNT = BigInt.fromU32(1500 * 10 ** 6);
export const WETH_SWAP_AMOUNT = BigInt.fromU64(<u64>(1 * 10 ** 18));
export const WELL_LP_AMOUNT = BigInt.fromU64(<u64>(10 * 10 ** 18));
export const BEAN_USD_PRICE = BigInt.fromString("938452");
export const BEAN_USD_AMOUNT = toDecimal(BEAN_SWAP_AMOUNT).times(toDecimal(BEAN_USD_PRICE));
export const WETH_USD_AMOUNT = toDecimal(BEAN_SWAP_AMOUNT)
  .div(toDecimal(WETH_SWAP_AMOUNT, 18))
  .times(toDecimal(BEAN_USD_PRICE));

export const SWAP_ACCOUNT = Address.fromString("0x1234567890abcdef1234567890abcdef12345678");

export const CURRENT_BLOCK_TIMESTAMP = BigInt.fromI32(1676229656);
