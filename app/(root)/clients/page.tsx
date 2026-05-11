import HeaderBox from "@/components/HeaderBox";
import { getClients } from "@/lib/actions/client.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { UserPlus, Users, TrendingDown } from "lucide-react";
import ClientsTable from "@/components/ClientsTable";

export default async function ClientsPage() {
  const clients = await getClients() || [];
  const totalExposure = clients.reduce((acc: number, c: any) => acc + (c.outstandingBalance || 0), 0);

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Client List"
          subtext="Comprehensive database of all registered borrowers and their financial health."
        />
        <Link href="/clients/create" className="btn-primary">
          <span>Add New Client</span>
          <UserPlus className="size-4 opacity-70" />
        </Link>
      </header>

      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-10" style={{ backgroundColor: 'rgba(17,17,19,0.03)' }}></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Borrowers</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-700" style={{ outline: '1px solid rgba(229,231,235,0.5)' }}>
              <Users className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900">{clients.length}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Registered</span>
              <p className="text-12 text-gray-500 font-medium">Active accounts</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Loan Exposure</p>
            <div className="p-2 bg-danger-50 rounded-lg text-danger-600" style={{ outline: '1px solid rgba(254,226,226,1)' }}>
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900">{formatAmount(totalExposure)}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Outstanding</span>
              <p className="text-12 text-gray-500 font-medium">Unpaid principal</p>
            </div>
          </div>
        </div>
      </div>

      <ClientsTable clients={clients} />
    </section>
  )
}

