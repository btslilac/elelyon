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
    <section className="home-content">
      <HeaderBox 
        title="Borrower Registration"
        subtext="Onboard a new client into the lending ecosystem."
      />

      <section className="flex-1 pt-4">
        <form action={handleCreateClient} className="flex flex-col gap-8 max-w-2xl card-premium">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                <input type="text" name="firstName" required placeholder="John" className="input-class" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                <input type="text" name="lastName" required placeholder="Doe" className="input-class" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">National ID / Passport</label>
              <input type="text" name="nationalId" required placeholder="ID Number" className="input-class" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                <input type="tel" name="phone" required placeholder="+254 7..." className="input-class" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                <input type="email" name="email" placeholder="john@example.com" className="input-class" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Residential Address</label>
              <input type="text" name="address" placeholder="Physical location details" className="input-class" />
            </div>
          </div>

          <button type="submit" className="bg-primary text-white font-bold h-12 rounded-xl shadow-premium hover:bg-primary/90 transition-all active:scale-[0.98] mt-4">
            Register Client
          </button>
        </form>
      </section>
    </section>
  )
}
