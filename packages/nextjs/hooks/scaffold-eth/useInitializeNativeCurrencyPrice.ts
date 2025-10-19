import { useGlobalState } from "~~/services/store/store";

/**
 * Disabled Native Currency Price fetching to avoid RPC issues
 * ETH price is not needed for Plug and Charge application (uses USDC)
 */
export const useInitializeNativeCurrencyPrice = () => {
  const setNativeCurrencyPrice = useGlobalState(state => state.setNativeCurrencyPrice);
  const setIsNativeCurrencyFetching = useGlobalState(state => state.setIsNativeCurrencyFetching);

  // Immediately set price to 0 and stop fetching to avoid RPC errors
  setNativeCurrencyPrice(0);
  setIsNativeCurrencyFetching(false);
};
