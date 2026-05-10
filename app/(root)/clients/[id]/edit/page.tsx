import HeaderBox from "@/components/HeaderBox";
import { getClientById, updateClient } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserCheck, MapPin, Phone, Mail, FileText, ArrowRight } from "lucide-react";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    return <div>Client not found</div>;
  }

  const handleUpdateClient = async (formData: FormData) => {
    "use server";
    
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const nationalId = formData.get("nationalId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;

    const updated = await updateClient(id, {
      firstName,
      lastName,
      nationalId,
      email,
      phone,
      address,
    });

    if (updated) {
      redirect(`/clients`);
    }
  };

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox 
          title="Edit Client Profile"
          subtext={`Updating particulars for ${client.firstName} ${client.lastName}`}
        />
      </header>

      <section className="flex-1">
        <form action={handleUpdateClient} className="flex flex-col gap-8 max-w-3xl">
          
          {/* Personal Information */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <UserCheck className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Personal Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  First Name
                </label>
                <input type="text" name="firstName" defaultValue={client.firstName} required className="input-class w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  Last Name
                </label>
                <input type="text" name="lastName" defaultValue={client.lastName} required className="input-class w-full" />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="size-3.5" />
                  National ID / Passport Number
                </label>
                <input type="text" name="nationalId" defaultValue={client.nationalId} required className="input-class w-full" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Phone className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Phone className="size-3.5" />
                  Phone Number
                </label>
                <input type="tel" name="phone" defaultValue={client.phone} required className="input-class w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="size-3.5" />
                  Email Address (Optional)
                </label>
                <input type="email" name="email" defaultValue={client.email} className="input-class w-full" />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="size-3.5" />
                  Physical Address
                </label>
                <input type="text" name="address" defaultValue={client.address} className="input-class w-full" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 gap-4">
            <Link href="/clients" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-submit">
              <span>Save Changes</span>
              <ArrowRight className="size-4 opacity-70" />
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}
