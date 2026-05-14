import HeaderBox from "@/components/HeaderBox";
import { getClientById } from "@/lib/actions/client.actions";
import ClientEditForm from "@/components/ClientEditForm";
import { notFound } from "next/navigation";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox 
          title="Edit Client Profile"
          subtext={`Updating particulars for ${client.firstName} ${client.lastName}`}
        />
      </header>

      <section className="flex-1">
        <ClientEditForm client={client} />
      </section>
    </section>
  )
}

