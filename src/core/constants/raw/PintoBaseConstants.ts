import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PoolTokens, Token } from "../RuntimeConstants";

// Protocol tokens
export const BEAN_ERC20 = Address.fromString("0xb170000aeeFa790fa61D6e837d1035906839a3c8");
export const SILOED_BEAN = Address.fromString("0x00b174d66adA7d63789087F50A9b9e0e48446dc1");
export const PINTO_WETH = Address.fromString("0x3e11001CfbB6dE5737327c59E10afAB47B82B5d3");
export const PINTO_CBETH = Address.fromString("0x3e111115A82dF6190e36ADf0d552880663A4dBF1");
export const PINTO_CBBTC = Address.fromString("0x3e11226fe3d85142B734ABCe6e58918d5828d1b4");
export const PINTO_WSOL = Address.fromString("0x3e11444c7650234c748D743D8d374fcE2eE5E6C9");
export const PINTO_USDC = Address.fromString("0x3e1133aC082716DDC3114bbEFEeD8B1731eA9cb1");

// External tokens
export const WETH = Address.fromString("0x4200000000000000000000000000000000000006");
export const CBETH = Address.fromString("0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22");
export const CBBTC = Address.fromString("0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf");
export const WSOL = Address.fromString("0x1C61629598e4a901136a81BC138E5828dc150d67");
export const USDC = Address.fromString("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");

// Contracts
export const BEANSTALK = Address.fromString("0xD1A0D188E861ed9d15773a2F3574a2e94134bA8f");
export const BEANSTALK_PRICE_1 = Address.fromString("0xD0fd333F7B30c7925DEBD81B7b7a4DFE106c3a5E");
export const BEANSTALK_PRICE_2 = Address.fromString("0x13D25ABCB6a19948d35654715c729c6501230b49");
export const AQUIFER = Address.fromString("0xBA51AA60B3b8d9A36cc748a62Aa56801060183f8");
export const WELL_CP2 = Address.fromString("0xBA510C289fD067EBbA41335afa11F0591940d6fe");
export const WELL_STABLE2 = Address.fromString("0xBA51055a97b40d7f41f3F64b57469b5D45B67c87");

// Milestone

export const PINTOSTALK_BLOCK = BigInt.fromU32(22622961);
export const BASIN_BLOCK = BigInt.fromU64(22622966);
export const PI_1_BLOCK = BigInt.fromU64(22948714);
export const PRICE_2_BLOCK = BigInt.fromU32(28930862);

export const POOL_TOKENS: PoolTokens[] = [
  {
    pool: PINTO_WETH,
    tokens: [BEAN_ERC20, WETH]
  },
  {
    pool: PINTO_CBETH,
    tokens: [BEAN_ERC20, CBETH]
  },
  {
    pool: PINTO_CBBTC,
    tokens: [BEAN_ERC20, CBBTC]
  },
  {
    pool: PINTO_WSOL,
    tokens: [BEAN_ERC20, WSOL]
  },
  {
    pool: PINTO_USDC,
    tokens: [BEAN_ERC20, USDC]
  }
];

export const TOKEN_INFOS: Token[] = [
  {
    address: BEAN_ERC20,
    info: { name: "PINTO", decimals: BigInt.fromU32(6) }
  },
  {
    address: SILOED_BEAN,
    info: { name: "sPinto", decimals: BigInt.fromU32(18) }
  },
  {
    address: WETH,
    info: { name: "WETH", decimals: BigInt.fromU32(18) }
  },
  {
    address: CBETH,
    info: { name: "cbETH", decimals: BigInt.fromU32(18) }
  },
  {
    address: CBBTC,
    info: { name: "cbBTC", decimals: BigInt.fromU32(8) }
  },
  {
    address: WSOL,
    info: { name: "WSOL", decimals: BigInt.fromU32(9) }
  },
  {
    address: USDC,
    info: { name: "USDC", decimals: BigInt.fromU32(6) }
  },
  {
    address: PINTO_WETH,
    info: { name: "PINTOWETH LP", decimals: BigInt.fromU32(18) }
  },
  {
    address: PINTO_CBETH,
    info: { name: "PINTOCBETH LP", decimals: BigInt.fromU32(18) }
  },
  {
    address: PINTO_CBBTC,
    info: { name: "PINTOCBBTC LP", decimals: BigInt.fromU32(18) }
  },
  {
    address: PINTO_WSOL,
    info: { name: "PINTOWSOL LP", decimals: BigInt.fromU32(18) }
  },
  {
    address: PINTO_USDC,
    info: { name: "PINTOUSDC LP", decimals: BigInt.fromU32(18) }
  }
];
