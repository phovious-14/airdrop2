import { formatUsdValue } from "../utils/formatters";

interface AllocationInfoProps {
  amountUnlocked: string;
  solPrice: number;
  tokenSymbol?: string;
}

export const AllocationInfo = ({
  amountUnlocked,
  solPrice,
  tokenSymbol = "SOL",
}: AllocationInfoProps) => {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Your Allocation</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200 bg-white">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Claimable now
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {Number(amountUnlocked)} {tokenSymbol}
                <br />({formatUsdValue(Number(amountUnlocked), solPrice)})
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
