import HeaderBox from "@/components/HeaderBox";
import { getClients } from "@/lib/actions/client.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function ClientsPage() {
  const clients = await getClients() || [];

  return (
    <section className="home-content">
      <div className="flex w-full justify-between items-end">
        <HeaderBox 
          title="Client Registry"
          subtext="Comprehensive database of all registered borrowers and their financial health."
        />
        <Link href="/clients/create" className="bg-primary text-white px-6 h-11 rounded-xl font-bold text-14 shadow-premium hover:bg-primary/90 transition-all flex-center">
          Add New Client
        </Link>
      </div>

      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium border-t-4 border-t-primary">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Total Borrowers</p>
          <h2 className="text-30 font-black text-gray-900">{clients.length}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-success">Registered</span>
            <p className="text-12 text-gray-400 font-medium">Active accounts</p>
          </div>
        </div>
        
        <div className="card-premium border-t-4 border-t-red-500">
          <p className="text-12 font-bold text-gray-400 uppercase tracking-widest mb-1">Portfolio Exposure</p>
          <h2 className="text-30 font-black text-red-600">
            {formatAmount(clients.reduce((acc: number, c: any) => acc + (c.outstandingBalance || 0), 0))}
          </h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge badge-error">Outstanding</span>
            <p className="text-12 text-gray-400 font-medium">Unpaid principal</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-20 font-black text-gray-900 tracking-tight">Borrower Database</h2>
        <div className="card-premium p-0 overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">ID / Phone</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Disbursed</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-12 font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client: any) => (
                <tr key={client.$id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-center size-10 rounded-xl bg-primary/5 text-primary font-black text-14 border border-primary/10">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-bold">{client.firstName} {client.lastName}</span>
                        <span className="text-12 text-gray-400 font-medium">{client.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-600 font-medium">{client.nationalId}</span>
                      <span className="text-12 text-gray-400">{client.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-bold">{formatAmount(client.totalBorrowed || 0)}</td>
                  <td className="px-6 py-4 text-red-600 font-bold">{formatAmount(client.outstandingBalance || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/clients/${client.$id}/edit`} className="inline-flex h-8 items-center px-4 rounded-lg border border-gray-200 text-12 font-bold text-gray-600 hover:border-primary hover:text-primary transition-all bg-white shadow-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No borrower records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
