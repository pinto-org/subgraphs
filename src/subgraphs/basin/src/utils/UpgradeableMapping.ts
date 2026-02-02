import { Address } from "@graphprotocol/graph-ts";
import * as BeanstalkArb from "../../../../core/constants/raw/BeanstalkArbConstants";
import * as PintoBase from "../../../../core/constants/raw/PintoBaseConstants";

// For the upgradeable wells used in Beanstalk 3, the BoreWell event does not indicate the proxy address.
// A manual mapping is required.
export function getActualWell(boredWell: Address): Address {
  for (let i = 0; i < UPGRADEABLE_MAPPING.length; ++i) {
    if (UPGRADEABLE_MAPPING[i].boredWells.includes(boredWell)) {
      return UPGRADEABLE_MAPPING[i].proxy;
    }
  }
  // There is no upgradeable mapping here, passthrough the bored well address
  return boredWell;
}

export class UpgradeableMapping {
  proxy: Address;
  boredWells: Address[];
}

export const UPGRADEABLE_MAPPING: UpgradeableMapping[] = [
  // arbitrum
  {
    proxy: BeanstalkArb.BEAN_WETH,
    boredWells: [
      Address.fromString("0x15D7A96C3DBf6B267FaE741D15c3a72f331418fE"),
      Address.fromString("0xD902f7BD849da907202d177fafC1bD39f6BBaDC4")
    ]
  },
  {
    proxy: BeanstalkArb.BEAN_WSTETH,
    boredWells: [
      Address.fromString("0x4731431430E7febd8dF6A4aA7d28867927e827A6"),
      Address.fromString("0xC49B38dFF421622628258683444F4977078CB96B")
    ]
  },
  {
    proxy: BeanstalkArb.BEAN_WEETH,
    boredWells: [
      Address.fromString("0x8DC6400022aC4304B3236F4d073053056AC24086"),
      Address.fromString("0x45F6af24e6eB8371571Dde1464A458770CbBbb65")
    ]
  },
  {
    proxy: BeanstalkArb.BEAN_WBTC,
    boredWells: [
      Address.fromString("0xB147fF6E2fD05Ad3Db185028BeB3CCe4DCb12B72"),
      Address.fromString("0xd4baA4197Aa17c7f27A2465073de33690d77Ec7E")
    ]
  },
  {
    proxy: BeanstalkArb.BEAN_USDC,
    boredWells: [
      Address.fromString("0xdC29769DB1cAA5cab41835Ef9A42BecDE80de028"),
      Address.fromString("0xEaDDD2848e962817FD565eA269a7fEDb0588b3F4")
    ]
  },
  {
    proxy: BeanstalkArb.BEAN_USDT,
    boredWells: [
      Address.fromString("0xAcFb4644B708043AD6eff1Cc323fDa374Fe6d3cE"),
      Address.fromString("0xdE8317A2A31a1684e2E4bEcedEc17700718630D8")
    ]
  },
  // base
  {
    proxy: PintoBase.PINTO_WETH,
    boredWells: [
      Address.fromString("0xA152493661cd8bff7f5ba33C9C189439021d6748"),
      Address.fromString("0x8cab609400b70eC65973A1Ad4DF63193B82D43c1")
    ]
  },
  {
    proxy: PintoBase.PINTO_CBETH,
    boredWells: [
      Address.fromString("0xe7bfEFEE09e118087811Ed070D3529676dF38B35"),
      Address.fromString("0x2B2CF9ca7b0be4812A51745528e760467B0F717C")
    ]
  },
  {
    proxy: PintoBase.PINTO_CBBTC,
    boredWells: [
      Address.fromString("0x22B5DCfaf16219f394aa7645CF29dB5649F70C00"),
      Address.fromString("0x175c021718788c613F666018de08864767ede78C")
    ]
  },
  {
    proxy: PintoBase.PINTO_WSOL,
    boredWells: [
      Address.fromString("0xa4699E36E1175eeE9c443FC036d31849EC46bB7A"),
      Address.fromString("0x92bc83f67D8F2C1F668969D2eEd72325F4B726Cc")
    ]
  },
  {
    proxy: PintoBase.PINTO_USDC,
    boredWells: [
      Address.fromString("0xf03b62787c1975d38EFc2A8f2dC5bf1D081Bd372"),
      Address.fromString("0x7ea12704AF23867A8eAE6c6b80e06027A8120b82"),
      Address.fromString("0x72df00123eBb69EF17E941243e0436AB73F71D5D")
    ]
  },
  {
    proxy: PintoBase.PINTO_WSTETH,
    boredWells: [Address.fromString("0x3e11AfD88f9987dF06557ee84d8a38879b0503B0")]
  }
];
