import { Convert } from "../../../generated/Basin-ABIs/PintoLaunch";
import { convert } from "../../utils/Beanstalk";

export function handleConvert(event: Convert): void {
  convert({
    event,
    account: event.params.account,
    fromToken: event.params.fromToken,
    toToken: event.params.toToken,
    fromAmount: event.params.fromAmount,
    toAmount: event.params.toAmount,
    fromBdv: null,
    toBdv: null
  });
}
