import HeaderBox from "@/components/HeaderBox";
import { createClient } from "@/lib/actions/client.actions";
import { redirect } from "next/navigation";

export default function CreateClientPage() {
  const handleCreateClient = async (formData: FormData) => {
    "use server";
    
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const nationalId = formData.get("nationalId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;

    const client = await createClient({
      firstName,
      lastName,
      nationalId,
      email,
      phone,
      address,
    });

    if (client) {
      redirect(`/clients`);
    }
  };

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Register New Client"
        subtext="Add a new borrower to the system."
      />

      <section className="size-full pt-5">
        <form action={handleCreateClient} className="flex flex-col gap-6 max-w-2xl bg-white p-6 rounded-xl border border-gray-200">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">First Name</label>
              <input type="text" name="firstName" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Last Name</label>
              <input type="text" name="lastName" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">National ID / Passport Number</label>
            <input type="text" name="nationalId" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Phone Number</label>
              <input type="tel" name="phone" required className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-14 font-medium text-gray-700">Email (Optional)</label>
              <input type="email" name="email" className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-14 font-medium text-gray-700">Home Address</label>
            <input type="text" name="address" className="w-full rounded-lg border border-gray-300 p-3 text-16 outline-none" />
          </div>

          <button type="submit" className="text-16 w-full bg-bank-gradient font-semibold text-white shadow-form rounded-lg py-3 mt-4">
            Register Client
          </button>
        </form>
      </section>
    </section>
  )
}
