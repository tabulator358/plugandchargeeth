import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Block Explorer",
  description: "Block Explorer created with ⚡ PlugAndCharge.ETH",
});

const BlockExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default BlockExplorerLayout;
