import HeaderBox from "@/components/HeaderBox";
import { getClients } from "@/lib/actions/client.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { Users, Clock, Plus } from "lucide-react";

export default async function ClientsPage() {
  const clients = await getClients() || [];

  return (
    <section className="flex flex-col gap-8 px-5 sm:px-8 py-8 w-full max-w-7xl mx-auto">
      <div className="flex w-full justify-between items-start md:items-center flex-col md:flex-row gap-4 mb-2">
        <HeaderBox 
          title="Clients"
          subtext="Manage your loan clients and their balances."
        />
        <Link href="/clients/create" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium text-14 shadow-sm hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Client
        </Link>
      </div>

      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Total Clients</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">{clients.length}</h2>
            <p className="text-13 text-gray-400 mt-1">Registered borrowers</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-14 font-medium text-gray-500">Total Outstanding</p>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <h2 className="text-30 font-bold text-gray-900 tracking-tight">
              {formatAmount(clients.reduce((acc: number, c: any) => acc + (c.outstandingBalance || 0), 0))}
            </h2>
            <p className="text-13 text-gray-400 mt-1">Total debt in portfolio</p>
          </div>
        </div>
      </div>

      <section className="flex flex-col w-full gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">National ID</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Total Borrowed</th>
                  <th className="px-6 py-4">Outstanding</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client: any) => (
                  <tr key={client.$id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-12">
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </div>
                        <span className="text-gray-900 font-medium">{client.firstName} {client.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{client.nationalId}</td>
                    <td className="px-6 py-4 text-gray-500">{client.phone}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatAmount(client.totalBorrowed || 0)}</td>
                    <td className="px-6 py-4 text-red-600 font-medium">{formatAmount(client.outstandingBalance || 0)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/clients/${client.$id}/edit`} className="inline-block px-3 py-1.5 rounded-md text-13 font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        Edit Profile
                      </Link>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}
