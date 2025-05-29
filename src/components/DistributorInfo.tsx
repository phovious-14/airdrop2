import { DistributorInfo as DistributorInfoType } from "../types/distributor";
import { formatDuration, formatUsdValue } from "../utils/formatters";
import { convertRawToTokenAmount } from "../utils/token";

interface DistributorInfoProps {
  distributorInfo: DistributorInfoType;
  solPrice: number;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

export const DistributorInfo = ({
  distributorInfo,
  solPrice,
  tokenSymbol = "SOL",
  tokenDecimals = 9,
}: DistributorInfoProps) => {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          Distributor Information
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200 bg-white">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Public Key
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {distributorInfo.publicKey}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total Claimed
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {convertRawToTokenAmount(
                  distributorInfo.account.totalAmountClaimed,
                  tokenDecimals
                )}{" "}
                /{" "}
                {convertRawToTokenAmount(
                  distributorInfo.account.maxTotalClaim,
                  tokenDecimals
                )}{" "}
                {tokenSymbol}
                {solPrice > 0 && (
                  <span className="ml-2 text-gray-400">
                    (
                    {formatUsdValue(
                      convertRawToTokenAmount(
                        distributorInfo.account.totalAmountClaimed,
                        tokenDecimals
                      ),
                      solPrice
                    )}
                    )
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Nodes Claimed
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {distributorInfo.account.numNodesClaimed} /{" "}
                {distributorInfo.account.maxNumNodes}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Airdrop Type
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {Number(distributorInfo.account.unlockPeriod) === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Instant
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Vested (Unlock every{" "}
                    {formatDuration(
                      Number(distributorInfo.account.unlockPeriod)
                    )}
                    )
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
