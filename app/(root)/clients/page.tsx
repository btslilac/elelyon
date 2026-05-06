import HeaderBox from "@/components/HeaderBox";
import { getClients } from "@/lib/actions/client.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";

export default async function ClientsPage() {
  const clients = await getClients() || [];

  return (
    <section className="payment-transfer">
      <div className="flex w-full justify-between items-center mb-6">
        <HeaderBox 
          title="Clients"
          subtext="Manage your loan clients and their balances."
        />
        <Link href="/clients/create" className="bg-bank-gradient text-white px-5 py-2.5 rounded-lg font-semibold text-14 shadow-form hover:opacity-90 transition-all">
          + New Client
        </Link>
      </div>

      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 border-t-4 border-t-blue-600">
          <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Total Clients</p>
          <h2 className="text-30 font-bold text-black-1">{clients.length}</h2>
          <p className="text-12 text-gray-400 mt-1">Registered borrowers</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-chart flex flex-col gap-1 border-t-4 border-t-red-600">
          <p className="text-14 font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
          <h2 className="text-30 font-bold text-red-600">
            {formatAmount(clients.reduce((acc: number, c: any) => acc + (c.outstandingBalance || 0), 0))}
          </h2>
          <p className="text-12 text-gray-400 mt-1">Total debt in portfolio</p>
        </div>
      </div>

      <section className="size-full pt-5">
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-chart">
          <table className="w-full text-sm text-left border-collapse bg-white">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">National ID</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Total Borrowed</th>
                <th className="px-6 py-4 font-semibold">Outstanding</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client: any) => (
                <tr key={client.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-center size-10 rounded-full bg-blue-100 text-blue-700 font-bold text-14">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </div>
                      <span className="text-gray-900 font-semibold">{client.firstName} {client.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{client.nationalId}</td>
                  <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{formatAmount(client.totalBorrowed || 0)}</td>
                  <td className="px-6 py-4 text-red-600 font-semibold">{formatAmount(client.outstandingBalance || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/clients/${client.$id}/edit`} className="inline-block px-4 py-1.5 rounded-lg border border-gray-200 text-12 font-bold text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                      Edit Profile
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
