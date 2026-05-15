import { getClientFullProfile } from "@/lib/actions/client.actions";
import ClientDetailsHeader from "@/components/details/ClientDetailsHeader";
import ClientTabs from "@/components/details/ClientTabs";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ClientDetailsPage({ params }: SearchParamProps) {
  const { id } = await params;
  const profile = await getClientFullProfile(id);

  if (!profile) {
    notFound();
  }

  const { client, loans, repayments, penalties, auditLogs, notifications, documents } = profile;

  return (
    <section className="home-content">
      {/* Back Button */}
      <div className="mb-6">
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 text-14 font-medium text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back to Client List
        </Link>
      </div>

      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <ClientDetailsHeader client={client} penalties={penalties} />

        {/* Tabbed Content */}
        <div className="mt-4">
          <ClientTabs 
            client={client} 
            loans={loans} 
            repayments={repayments} 
            penalties={penalties} 
            auditLogs={auditLogs}
            notifications={notifications}
            documents={documents}
          />
        </div>
      </div>
    </section>
  );
}
