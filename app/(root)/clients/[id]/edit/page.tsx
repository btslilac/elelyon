import HeaderBox from "@/components/HeaderBox";
import { getClientById, updateClient } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";

import Link from "next/link";

export default async function EditClientPage({ params: { id } }: { params: { id: string } }) {
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
    <section className="payment-transfer">
      <HeaderBox 
        title="Edit Client"
        subtext={`Updating particulars for ${client.firstName} ${client.lastName}`}
      />

      <section className="size-full pt-5">
        <form action={handleUpdateClient} className="flex flex-col gap-6 max-w-2xl bg-white p-6 rounded-xl border border-gray-200">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">First Name</label>
              <input type="text" name="firstName" defaultValue={client.firstName} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Last Name</label>
              <input type="text" name="lastName" defaultValue={client.lastName} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">National ID / Passport Number</label>
            <input type="text" name="nationalId" defaultValue={client.nationalId} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Phone Number</label>
              <input type="tel" name="phone" defaultValue={client.phone} required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Email (Optional)</label>
              <input type="email" name="email" defaultValue={client.email} className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Home Address</label>
            <input type="text" name="address" defaultValue={client.address} className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="flex gap-4">
             <button type="submit" className="text-16 flex-1 bg-bank-gradient font-semibold text-white shadow-form rounded-lg py-3 mt-4">
              Save Changes
            </button>
            <Link href="/clients" className="text-16 flex-1 flex items-center justify-center bg-gray-100 font-semibold text-gray-700 border border-gray-200 rounded-lg py-3 mt-4">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </section>
  )
}
