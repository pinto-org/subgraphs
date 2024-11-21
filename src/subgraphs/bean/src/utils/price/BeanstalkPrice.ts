// Unfortunately this file must be copied across the various subgraph projects. This is due to the codegen
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  BeanstalkPrice,
  BeanstalkPrice__priceResultPPsStruct,
  BeanstalkPrice__priceResultPStruct
} from "../../../generated/Bean-ABIs/BeanstalkPrice";
import { ZERO_BI } from "../../../../../core/utils/Decimals";
import { loadBean } from "../../entities/Bean";
import { toAddressArray } from "../../../../../core/utils/Bytes";
import { getBeanstalkPriceAddress, getProtocolToken } from "../../../../../core/constants/RuntimeConstants";
import { v } from "../constants/Version";

// Can't use the autogenerated one because the fields need to be updateable
class PriceOverallStruct {
  price: BigInt;
  liquidity: BigInt;
  deltaB: BigInt;
  ps: PricePoolStruct[];

  constructor(value: BeanstalkPrice__priceResultPStruct) {
    this.price = value.price;
    this.liquidity = value.liquidity;
    this.deltaB = value.deltaB;
    this.ps = [];
    for (let i = 0; i < value.ps.length; ++i) {
      this.ps.push(new PricePoolStruct(value.ps[i]));
    }
  }
}

class PricePoolStruct {
  pool: Address;
  tokens: Address[];
  balances: BigInt[];
  price: BigInt;
  liquidity: BigInt;
  deltaB: BigInt;
  lpUsd: BigInt;
  lpBdv: BigInt;

  constructor(value: BeanstalkPrice__priceResultPPsStruct) {
    this.pool = value.pool;
    this.tokens = value.tokens;
    this.balances = value.balances;
    this.price = value.price;
    this.liquidity = value.liquidity;
    this.deltaB = value.deltaB;
    this.lpUsd = value.lpUsd;
    this.lpBdv = value.lpBdv;
  }
}

export class BeanstalkPriceResult {
  private _value: PriceOverallStruct | null = null;
  private _dewhitelistedPools: Array<PricePoolStruct> = [];

  constructor(value: BeanstalkPrice__priceResultPStruct | null, whitelistedPools: Address[]) {
    if (value !== null) {
      this._value = new PriceOverallStruct(value);
      let poolsCount = this._value!.ps.length;
      let dewhitelistCount = 0;
      for (let i = 0; i < this._value!.ps.length; ++i) {
        const index = whitelistedPools.indexOf(this._value!.ps[i].pool);
        if (index == -1) {
          // The pool was dewhitelisted
          this._dewhitelistedPools.push(this._value!.ps.splice(i--, 1)[0]);
          ++dewhitelistCount;
        }
      }

      // Recalculate overall price/liquidity/delta if some but not all pools got dewhitelisted
      if (dewhitelistCount > 0 && dewhitelistCount < poolsCount) {
        this._value!.price = ZERO_BI;
        this._value!.liquidity = ZERO_BI;
        this._value!.deltaB = ZERO_BI;
        for (let i = 0; i < this._value!.ps.length; ++i) {
          this._value!.price = this._value!.price.plus(this._value!.ps[i].price.times(this._value!.ps[i].liquidity));
          this._value!.liquidity = this._value!.liquidity.plus(this._value!.ps[i].liquidity);
          this._value!.deltaB = this._value!.deltaB.plus(this._value!.ps[i].deltaB);
        }
        this._value!.price = this._value!.price.div(this._value!.liquidity);
      } else if (dewhitelistCount == poolsCount) {
        this._value!.ps = this._dewhitelistedPools;
      }
    }
  }

  get reverted(): boolean {
    return this._value == null;
  }

  get value(): PriceOverallStruct {
    assert(
      !this.reverted,
      "accessed value of a reverted call, please check the `reverted` field before accessing the `value` field"
    );
    return this._value!;
  }

  // Dewhitelsited pools are remvoed from value struct and placed here.
  get dewhitelistedPools(): Array<PricePoolStruct> {
    assert(
      !this.reverted,
      "accessed value of a reverted call, please check the `reverted` field before accessing the `value` field"
    );
    return this._dewhitelistedPools;
  }
}

// Wrapper for BeanstalkPrice contract that handles a few things:
// (1) Only including whitelisted tokens in the final price calculation and the prices list
// (2) Which contract to call (in anticipation of new BeanstalkPrice contract deployments)
export function BeanstalkPrice_try_price(blockNumber: BigInt): BeanstalkPriceResult {
  const beanAddr = getProtocolToken(v(), blockNumber);
  let beanstalkPrice = getBeanstalkPrice(blockNumber);
  let beanPrice = beanstalkPrice.try_price();

  if (beanPrice.reverted) {
    return new BeanstalkPriceResult(null, []);
  }

  let bean = loadBean(beanAddr);

  // changetype is necessary as there are identical responses from different generated contract objects.
  // If the response structure changes in the future, this will need to be revisited.
  return new BeanstalkPriceResult(
    changetype<BeanstalkPrice__priceResultPStruct>(beanPrice.value),
    toAddressArray(bean.pools)
  );
}

// Extracts the pool price from the larger result
export function getPoolPrice(priceResult: BeanstalkPriceResult, pool: Address): PricePoolStruct | null {
  for (let i = 0; i < priceResult.value.ps.length; ++i) {
    // Zero liquidity responses are also omitted - this can be caused on a legacy price contract implementation
    // due to extreme discrepancies in chainlink vs uniswap oracle price. Particularly for the bean subgraph,
    // it is preferable to omit those events from being handled than to have periods where zero liquidity is reported.
    if (priceResult.value.ps[i].pool == pool && priceResult.value.ps[i].liquidity.gt(ZERO_BI)) {
      return priceResult.value.ps[i];
    }
  }

  for (let i = 0; i < priceResult.dewhitelistedPools.length; ++i) {
    if (priceResult.dewhitelistedPools[i].pool == pool) {
      return priceResult.dewhitelistedPools[i];
    }
  }
  return null;
}

// Gets the BeanstalkPrice contract, bound to the appropriate instance of the contract.
// Note: The caller still needs to check for reverts.
export function getBeanstalkPrice(blockNumber: BigInt): BeanstalkPrice {
  return BeanstalkPrice.bind(getBeanstalkPriceAddress(v(), blockNumber));
}
